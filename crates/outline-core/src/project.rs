use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub version: u32,
    pub units: String,
    pub project_name: String,
    pub sketch: Sketch,
    pub operations: Vec<Operation>,
    pub meshes: Vec<Mesh>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sketch {
    pub plane: String,
    pub entities: Vec<Entity>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub id: String,
    #[serde(rename = "type")]
    pub entity_type: String,
    pub points: Vec<Point>,
    pub closed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Operation {
    pub id: String,
    #[serde(rename = "type")]
    pub op_type: String,
    pub source_entity_id: String,
    pub height_mm: f64,
    pub wall_thickness_mm: f64,
    pub offset_side: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mesh {
    pub id: String,
    pub vertices: Vec<[f64; 3]>,
    pub triangles: Vec<[u32; 3]>,
}

impl Project {
    pub fn new(name: &str) -> Self {
        Self {
            version: 1,
            units: "mm".to_string(),
            project_name: name.to_string(),
            sketch: Sketch {
                plane: "XY".to_string(),
                entities: Vec::new(),
            },
            operations: Vec::new(),
            meshes: Vec::new(),
        }
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.sketch.entities.is_empty() {
            return Err("Empty sketch. Draw a profile first.".to_string());
        }
        Ok(())
    }
}
