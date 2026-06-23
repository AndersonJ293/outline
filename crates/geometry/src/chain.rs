use crate::entities::{Entity, Point};

const ENDPOINT_EPSILON: f64 = 0.001;

#[derive(Debug, Clone)]
pub struct Chain {
    pub root_entity_id: String,
    pub root_point: Point,
    pub segment_ids: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ChainContour {
    pub points: Vec<Point>,
    pub closed: bool,
}

fn is_open_path(entity: &Entity) -> bool {
    if entity.closed {
        return false;
    }
    entity.entity_type == "polyline" || entity.entity_type == "spline"
}

fn endpoint_of(entity: &Entity, end: End) -> Point {
    let idx = match end {
        End::Start => 0,
        End::End => entity.points.len().saturating_sub(1),
    };
    entity.points[idx]
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum End {
    Start,
    End,
}

fn points_equal(a: Point, b: Point) -> bool {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    (dx * dx + dy * dy).sqrt() < ENDPOINT_EPSILON
}

fn shares_endpoint(a: &Entity, b: &Entity) -> bool {
    let a_start = endpoint_of(a, End::Start);
    let a_end = endpoint_of(a, End::End);
    let b_start = endpoint_of(b, End::Start);
    let b_end = endpoint_of(b, End::End);
    points_equal(a_start, b_start)
        || points_equal(a_start, b_end)
        || points_equal(a_end, b_start)
        || points_equal(a_end, b_end)
}

fn find_chain_root<'a>(component: &[&'a Entity]) -> &'a Entity {
    for entity in component {
        let first = endpoint_of(entity, End::Start);
        let is_root = !component.iter().any(|other| {
            other.id != entity.id
                && (points_equal(first, endpoint_of(other, End::Start))
                    || points_equal(first, endpoint_of(other, End::End)))
        });
        if is_root {
            return entity;
        }
    }
    component[0]
}

pub fn compute_chains(entities: &[Entity]) -> Vec<Chain> {
    let open_entities: Vec<&Entity> = entities.iter().filter(|e| is_open_path(e)).collect();
    let mut visited = std::collections::HashSet::new();
    let mut chains: Vec<Chain> = Vec::new();

    for entity in &open_entities {
        if visited.contains(&entity.id) {
            continue;
        }
        let mut component: Vec<&Entity> = Vec::new();
        let mut queue: Vec<&Entity> = vec![entity];
        while let Some(current) = queue.pop() {
            if visited.contains(&current.id) {
                continue;
            }
            visited.insert(current.id.clone());
            component.push(current);
            for other in &open_entities {
                if visited.contains(&other.id) || other.id == current.id {
                    continue;
                }
                if shares_endpoint(current, other) {
                    queue.push(other);
                }
            }
        }
        if component.is_empty() {
            continue;
        }
        let root = find_chain_root(&component);
        chains.push(Chain {
            root_entity_id: root.id.clone(),
            root_point: endpoint_of(root, End::Start),
            segment_ids: component.iter().map(|e| e.id.clone()).collect(),
        });
    }

    chains
}

#[derive(Debug, Clone)]
struct DirectedEntity<'a> {
    entity: &'a Entity,
    reversed: bool,
}

impl DirectedEntity<'_> {
    fn endpoint(&self, end: End) -> Point {
        let pts = &self.entity.points;
        let is_start = end == End::Start;
        let pick_start = is_start != self.reversed;
        if pick_start {
            pts[0]
        } else {
            pts[pts.len() - 1]
        }
    }
}

fn order_chain_entities<'a>(entities: &[&'a Entity]) -> Option<Vec<DirectedEntity<'a>>> {
    if entities.is_empty() {
        return Some(Vec::new());
    }
    if entities.len() == 1 {
        return Some(vec![DirectedEntity {
            entity: entities[0],
            reversed: false,
        }]);
    }

    let mut used = std::collections::HashSet::new();
    let mut ordered: Vec<DirectedEntity> = Vec::new();

    let mut start = DirectedEntity {
        entity: entities[0],
        reversed: false,
    };
    for entity in entities {
        for &reversed in &[false, true] {
            let dir = DirectedEntity { entity, reversed };
            let start_pt = dir.endpoint(End::Start);
            let is_free = !entities.iter().any(|other| {
                other.id != entity.id
                    && (points_equal(start_pt, endpoint_of(other, End::Start))
                        || points_equal(start_pt, endpoint_of(other, End::End)))
            });
            if is_free {
                start = dir;
                break;
            }
        }
    }

    ordered.push(DirectedEntity {
        entity: start.entity,
        reversed: start.reversed,
    });
    used.insert(start.entity.id.clone());

    while used.len() < entities.len() {
        let last_end = ordered.last().unwrap().endpoint(End::End);
        let mut found = false;

        for entity in entities {
            if used.contains(&entity.id) {
                continue;
            }
            if points_equal(last_end, endpoint_of(entity, End::Start)) {
                ordered.push(DirectedEntity {
                    entity,
                    reversed: false,
                });
                used.insert(entity.id.clone());
                found = true;
                break;
            }
            if points_equal(last_end, endpoint_of(entity, End::End)) {
                ordered.push(DirectedEntity {
                    entity,
                    reversed: true,
                });
                used.insert(entity.id.clone());
                found = true;
                break;
            }
        }
        if found {
            continue;
        }

        let first_start = ordered[0].endpoint(End::Start);
        for entity in entities {
            if used.contains(&entity.id) {
                continue;
            }
            if points_equal(first_start, endpoint_of(entity, End::End)) {
                ordered.insert(
                    0,
                    DirectedEntity {
                        entity,
                        reversed: false,
                    },
                );
                used.insert(entity.id.clone());
                found = true;
                break;
            }
            if points_equal(first_start, endpoint_of(entity, End::Start)) {
                ordered.insert(
                    0,
                    DirectedEntity {
                        entity,
                        reversed: true,
                    },
                );
                used.insert(entity.id.clone());
                found = true;
                break;
            }
        }
        if !found {
            return None;
        }
    }

    Some(ordered)
}

pub fn chain_contour(chain: &Chain, entities: &[Entity]) -> Option<ChainContour> {
    let chain_entities: Vec<&Entity> = chain
        .segment_ids
        .iter()
        .filter_map(|id| entities.iter().find(|e| e.id == *id))
        .collect();
    if chain_entities.is_empty() {
        return None;
    }

    let ordered = order_chain_entities(&chain_entities)?;

    let mut points: Vec<Point> = Vec::new();
    for dir in &ordered {
        let mut pts = dir.entity.points.clone();
        if dir.reversed {
            pts.reverse();
        }
        if points.is_empty() {
            points.extend(pts);
        } else {
            let last = points[points.len() - 1];
            if points_equal(last, pts[0]) {
                points.extend(pts.into_iter().skip(1));
            } else {
                points.extend(pts);
            }
        }
    }

    if points.len() < 2 {
        return None;
    }
    let closed = points_equal(points[0], points[points.len() - 1]);
    if closed && points.len() > 1 {
        points.pop();
    }
    Some(ChainContour { points, closed })
}

pub fn is_closed_chain(chain: &Chain, entities: &[Entity]) -> bool {
    chain_contour(chain, entities).is_some_and(|c| c.closed)
}

pub fn find_chain_for_entity<'a>(entity: &'a Entity, entities: &'a [Entity]) -> Option<Chain> {
    let chains = compute_chains(entities);
    chains
        .into_iter()
        .find(|c| c.segment_ids.contains(&entity.id))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn p(x: f64, y: f64) -> Point {
        Point { x, y }
    }

    fn e(id: &str, pts: Vec<Point>, closed: bool) -> Entity {
        Entity {
            id: id.to_string(),
            entity_type: "polyline".to_string(),
            points: pts,
            closed,
            control_points: None,
            sampling_steps: None,
        }
    }

    #[test]
    fn test_no_chains_with_empty_entities() {
        let chains = compute_chains(&[]);
        assert!(chains.is_empty());
    }

    #[test]
    fn test_no_chains_with_only_closed_entities() {
        let entities = vec![e(
            "e1",
            vec![p(0.0, 0.0), p(10.0, 0.0), p(10.0, 10.0)],
            true,
        )];
        let chains = compute_chains(&entities);
        assert!(chains.is_empty());
    }

    #[test]
    fn test_single_open_entity_forms_chain() {
        let entities = vec![e("e1", vec![p(0.0, 0.0), p(10.0, 10.0)], false)];
        let chains = compute_chains(&entities);
        assert_eq!(chains.len(), 1);
        assert_eq!(chains[0].segment_ids, vec!["e1"]);
    }

    #[test]
    fn test_two_connected_entities_form_chain() {
        let entities = vec![
            e("e1", vec![p(0.0, 0.0), p(10.0, 0.0)], false),
            e("e2", vec![p(10.0, 0.0), p(10.0, 10.0)], false),
        ];
        let chains = compute_chains(&entities);
        assert_eq!(chains.len(), 1);
        assert_eq!(chains[0].segment_ids.len(), 2);
    }

    #[test]
    fn test_two_disconnected_entities_form_two_chains() {
        let entities = vec![
            e("e1", vec![p(0.0, 0.0), p(10.0, 0.0)], false),
            e("e2", vec![p(100.0, 0.0), p(100.0, 10.0)], false),
        ];
        let chains = compute_chains(&entities);
        assert_eq!(chains.len(), 2);
    }

    #[test]
    fn test_triangle_chain_closed() {
        let entities = vec![
            e("e1", vec![p(0.0, 0.0), p(10.0, 0.0)], false),
            e("e2", vec![p(10.0, 0.0), p(10.0, 10.0)], false),
            e("e3", vec![p(10.0, 10.0), p(0.0, 0.0)], false),
        ];
        let chains = compute_chains(&entities);
        assert_eq!(chains.len(), 1);
        assert!(is_closed_chain(&chains[0], &entities));
    }

    #[test]
    fn test_open_chain_not_closed() {
        let entities = vec![
            e("e1", vec![p(0.0, 0.0), p(10.0, 0.0)], false),
            e("e2", vec![p(10.0, 0.0), p(10.0, 10.0)], false),
        ];
        let chains = compute_chains(&entities);
        assert_eq!(chains.len(), 1);
        assert!(!is_closed_chain(&chains[0], &entities));
    }

    #[test]
    fn test_chain_contour_produces_ordered_points() {
        let entities = vec![
            e("e1", vec![p(0.0, 0.0), p(10.0, 0.0)], false),
            e("e2", vec![p(10.0, 0.0), p(10.0, 10.0)], false),
            e("e3", vec![p(10.0, 10.0), p(0.0, 0.0)], false),
        ];
        let chains = compute_chains(&entities);
        let contour = chain_contour(&chains[0], &entities).unwrap();
        assert!(contour.closed);
        assert_eq!(contour.points.len(), 3);
    }

    #[test]
    fn test_reversed_entity_in_chain() {
        // e2 is reversed: start connects to e1 end, but e2 end needs to connect
        let entities = vec![
            e("e1", vec![p(0.0, 0.0), p(10.0, 0.0)], false),
            e("e2", vec![p(10.0, 10.0), p(10.0, 0.0)], false),
            e("e3", vec![p(10.0, 10.0), p(0.0, 0.0)], false),
        ];
        let chains = compute_chains(&entities);
        assert_eq!(chains.len(), 1);
        assert!(is_closed_chain(&chains[0], &entities));
    }

    #[test]
    fn test_find_chain_for_entity() {
        let entities = vec![
            e("e1", vec![p(0.0, 0.0), p(10.0, 0.0)], false),
            e("e2", vec![p(10.0, 0.0), p(10.0, 10.0)], false),
        ];
        let chain = find_chain_for_entity(&entities[0], &entities).unwrap();
        assert_eq!(chain.segment_ids.len(), 2);
    }
}
