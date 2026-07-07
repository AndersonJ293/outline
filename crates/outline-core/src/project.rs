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
pub struct SketchProfile {
    pub id: String,
    #[serde(rename = "outerEntityId")]
    pub outer_entity_id: String,
    #[serde(
        default,
        rename = "innerEntityId",
        skip_serializing_if = "Option::is_none"
    )]
    pub inner_entity_id: Option<String>,
    #[serde(rename = "areaMm2")]
    pub area_mm2: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplineHandle {
    pub dx: f64,
    pub dy: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplineControlPoint {
    pub point: Point,
    #[serde(rename = "handleOut")]
    pub handle_out: SplineHandle,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub id: String,
    #[serde(rename = "type")]
    pub entity_type: String,
    pub points: Vec<Point>,
    pub closed: bool,
    #[serde(
        default,
        rename = "controlPoints",
        skip_serializing_if = "Option::is_none"
    )]
    pub control_points: Option<Vec<SplineControlPoint>>,
    #[serde(
        default,
        rename = "samplingSteps",
        skip_serializing_if = "Option::is_none"
    )]
    pub sampling_steps: Option<u32>,
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
    #[serde(default)]
    pub source_entity_id: String,
    #[serde(
        default,
        rename = "sourceProfileId",
        skip_serializing_if = "Option::is_none"
    )]
    pub source_profile_id: Option<String>,
    #[serde(default = "default_boolean_operation")]
    pub operation: String,
    pub height_mm: f64,
    pub wall_thickness_mm: f64,
    pub offset_side: String,
}

fn default_boolean_operation() -> String {
    "new_body".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mesh {
    pub id: String,
    pub vertices: Vec<[f64; 3]>,
    pub triangles: Vec<[u32; 3]>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OperationKind {
    /// Solid extrusion of a closed profile.
    Extrude,
    /// Thin-wall extrusion of a contour (cookie-cutter style).
    ExtrudeThin,
}

impl OperationKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            OperationKind::Extrude => "extrude",
            OperationKind::ExtrudeThin => "extrude_thin",
        }
    }
}

impl Operation {
    pub fn kind(&self) -> OperationKind {
        match self.op_type.as_str() {
            "extrude_thin" => OperationKind::ExtrudeThin,
            _ => OperationKind::Extrude,
        }
    }
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
