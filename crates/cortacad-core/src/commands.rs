use crate::project::{Entity, Operation, Mesh};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CommandResult<T> {
    pub ok: bool,
    pub value: Option<T>,
    pub error: Option<CommandError>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl<T> CommandResult<T> {
    pub fn ok(value: T) -> Self {
        Self {
            ok: true,
            value: Some(value),
            error: None,
        }
    }

    pub fn err(code: &str, message: &str) -> Self {
        Self {
            ok: false,
            value: None,
            error: Some(CommandError {
                code: code.to_string(),
                message: message.to_string(),
            }),
        }
    }
}

pub fn validate_closed_profile(entity: &Entity) -> CommandResult<bool> {
    if !entity.closed {
        return CommandResult::err(
            "PROFILE_NOT_CLOSED",
            "O contorno precisa estar fechado para gerar um cortador.",
        );
    }
    if entity.points.len() < 3 {
        return CommandResult::err(
            "PROFILE_TOO_SMALL",
            "O contorno precisa de pelo menos 3 pontos.",
        );
    }
    CommandResult::ok(true)
}

pub fn generate_wall_mesh(
    entity: &Entity,
    operation: &Operation,
) -> CommandResult<Mesh> {
    // Validação inicial
    let validation = validate_closed_profile(entity);
    if !validation.ok {
        return CommandResult::err(
            &validation.error.as_ref().unwrap().code,
            &validation.error.as_ref().unwrap().message,
        );
    }

    // MVP: gera uma malha cúbica simples ao redor do contorno
    // Versão futura: offset + triangulação real
    let height = operation.height_mm;
    let wall_thickness = operation.wall_thickness_mm;

    // Encontra bounding box do contorno
    let min_x = entity.points.iter().map(|p| p.x).fold(f64::INFINITY, f64::min);
    let max_x = entity.points.iter().map(|p| p.x).fold(f64::NEG_INFINITY, f64::max);
    let min_y = entity.points.iter().map(|p| p.y).fold(f64::INFINITY, f64::min);
    let max_y = entity.points.iter().map(|p| p.y).fold(f64::NEG_INFINITY, f64::max);

    // Gera uma caixa simples representando a parede
    let (x1, x2) = (min_x - wall_thickness, max_x + wall_thickness);
    let (y1, y2) = (min_y - wall_thickness, max_y + wall_thickness);

    // 8 vértices de um paralelepípedo
    let vertices = vec![
        [x1, y1, 0.0],     // 0: fundo inferior esquerdo
        [x2, y1, 0.0],     // 1: fundo inferior direito
        [x2, y2, 0.0],     // 2: fundo superior direito
        [x1, y2, 0.0],     // 3: fundo superior esquerdo
        [x1, y1, height],  // 4: topo inferior esquerdo
        [x2, y1, height],  // 5: topo inferior direito
        [x2, y2, height],  // 6: topo superior direito
        [x1, y2, height],  // 7: topo superior esquerdo
    ];

    // 12 triângulos (2 por face)
    let triangles = vec![
        // Faces laterais (paredes)
        [0, 1, 5], [0, 5, 4],  // frente
        [1, 2, 6], [1, 6, 5],  // direita
        [2, 3, 7], [2, 7, 6],  // trás
        [3, 0, 4], [3, 4, 7],  // esquerda
        // Fundo
        [0, 3, 2], [0, 2, 1],
        // Topo
        [4, 5, 6], [4, 6, 7],
    ];

    CommandResult::ok(Mesh {
        id: format!("mesh_{}", operation.id),
        vertices,
        triangles,
    })
}
