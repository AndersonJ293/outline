use serde::{Deserialize, Serialize};

// ── DTOs for the frontend ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectDto {
    pub version: u32,
    pub units: String,
    pub project_name: String,
    pub sketch: SketchDto,
    pub operations: Vec<OperationDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SketchDto {
    pub plane: String,
    pub entities: Vec<EntityDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplineHandleDto {
    pub dx: f64,
    pub dy: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplineControlPointDto {
    pub point: PointDto,
    #[serde(rename = "handleOut")]
    pub handle_out: SplineHandleDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityDto {
    pub id: String,
    #[serde(rename = "type")]
    pub entity_type: String,
    pub points: Vec<PointDto>,
    pub closed: bool,
    #[serde(
        default,
        rename = "controlPoints",
        skip_serializing_if = "Option::is_none"
    )]
    pub control_points: Option<Vec<SplineControlPointDto>>,
    #[serde(
        default,
        rename = "samplingSteps",
        skip_serializing_if = "Option::is_none"
    )]
    pub sampling_steps: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PointDto {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationDto {
    pub id: String,
    #[serde(rename = "type")]
    pub op_type: String,
    pub source_entity_id: String,
    pub height_mm: f64,
    pub wall_thickness_mm: f64,
    pub offset_side: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeshDto {
    pub id: String,
    pub vertices: Vec<[f64; 3]>,
    pub triangles: Vec<[u32; 3]>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandErrorDto {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidateProfileResult {
    pub ok: bool,
    pub error: Option<CommandErrorDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateMeshResult {
    pub ok: bool,
    pub mesh: Option<MeshDto>,
    pub error: Option<CommandErrorDto>,
}

// ── Conversions ──

impl From<&outline_core::project::Project> for ProjectDto {
    fn from(p: &outline_core::project::Project) -> Self {
        Self {
            version: p.version,
            units: p.units.clone(),
            project_name: p.project_name.clone(),
            sketch: SketchDto {
                plane: p.sketch.plane.clone(),
                entities: p
                    .sketch
                    .entities
                    .iter()
                    .map(|e| EntityDto {
                        id: e.id.clone(),
                        entity_type: e.entity_type.clone(),
                        points: e
                            .points
                            .iter()
                            .map(|pt| PointDto { x: pt.x, y: pt.y })
                            .collect(),
                        closed: e.closed,
                        control_points: e.control_points.as_ref().map(|cps| {
                            cps.iter()
                                .map(|cp| SplineControlPointDto {
                                    point: PointDto {
                                        x: cp.point.x,
                                        y: cp.point.y,
                                    },
                                    handle_out: SplineHandleDto {
                                        dx: cp.handle_out.dx,
                                        dy: cp.handle_out.dy,
                                    },
                                })
                                .collect()
                        }),
                        sampling_steps: e.sampling_steps,
                    })
                    .collect(),
            },
            operations: p
                .operations
                .iter()
                .map(|op| OperationDto {
                    id: op.id.clone(),
                    op_type: op.op_type.clone(),
                    source_entity_id: op.source_entity_id.clone(),
                    height_mm: op.height_mm,
                    wall_thickness_mm: op.wall_thickness_mm,
                    offset_side: op.offset_side.clone(),
                })
                .collect(),
        }
    }
}
