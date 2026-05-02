use std::fs;
use std::path::Path;

/// Representa uma malha triangular 3D
#[derive(Debug, Clone)]
pub struct MeshData {
    pub vertices: Vec<[f64; 3]>,
    pub triangles: Vec<[u32; 3]>,
}

/// Exporta malha como STL ASCII
pub fn export_stl_ascii(mesh: &MeshData, output_path: &Path, name: &str) -> Result<(), String> {
    let mut stl = String::new();

    stl.push_str(&format!("solid {}\n", name));

    // Calcula normais e escreve cada triângulo
    for tri in &mesh.triangles {
        let v0 = mesh.vertices[tri[0] as usize];
        let v1 = mesh.vertices[tri[1] as usize];
        let v2 = mesh.vertices[tri[2] as usize];

        // Calcula normal (vetor produto cruzado)
        let ux = v1[0] - v0[0];
        let uy = v1[1] - v0[1];
        let uz = v1[2] - v0[2];
        let vx = v2[0] - v0[0];
        let vy = v2[1] - v0[1];
        let vz = v2[2] - v0[2];

        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;

        // Normaliza
        let len = (nx * nx + ny * ny + nz * nz).sqrt();
        let (nx, ny, nz) = if len > 0.0 {
            (nx / len, ny / len, nz / len)
        } else {
            (0.0, 0.0, 1.0)
        };

        stl.push_str(&format!("  facet normal {} {} {}\n", nx, ny, nz));
        stl.push_str("    outer loop\n");
        stl.push_str(&format!("      vertex {} {} {}\n", v0[0], v0[1], v0[2]));
        stl.push_str(&format!("      vertex {} {} {}\n", v1[0], v1[1], v1[2]));
        stl.push_str(&format!("      vertex {} {} {}\n", v2[0], v2[1], v2[2]));
        stl.push_str("    endloop\n");
        stl.push_str("  endfacet\n");
    }

    stl.push_str(&format!("endsolid {}\n", name));

    fs::write(output_path, stl).map_err(|e| format!("Erro ao escrever STL: {}", e))?;

    Ok(())
}

/// Exporta malha como STL binário (mais compacto)
pub fn export_stl_binary(mesh: &MeshData, output_path: &Path) -> Result<(), String> {
    use std::io::Write;

    let mut file =
        fs::File::create(output_path).map_err(|e| format!("Erro ao criar STL: {}", e))?;

    // Cabeçalho de 80 bytes
    let header = b"CortaCAD STL Export - cortabiscoito.app";
    file.write_all(&header[..])
        .map_err(|e| format!("Erro header: {}", e))?;
    // Preenche resto do header
    for _ in header.len()..80 {
        file.write_all(&[0u8])
            .map_err(|e| format!("Erro header: {}", e))?;
    }

    // Número de triângulos (u32, little-endian)
    let num_triangles = mesh.triangles.len() as u32;
    file.write_all(&num_triangles.to_le_bytes())
        .map_err(|e| format!("Erro num triangles: {}", e))?;

    // Cada triângulo: normal (3x f32) + 3 vértices (3x f32 cada) + 2 bytes atributo
    for tri in &mesh.triangles {
        let v0 = mesh.vertices[tri[0] as usize];
        let v1 = mesh.vertices[tri[1] as usize];
        let v2 = mesh.vertices[tri[2] as usize];

        // Normal
        let ux = v1[0] - v0[0];
        let uy = v1[1] - v0[1];
        let uz = v1[2] - v0[2];
        let vx = v2[0] - v0[0];
        let vy = v2[1] - v0[1];
        let vz = v2[2] - v0[2];
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        let len = (nx * nx + ny * ny + nz * nz).sqrt();
        let (nx, ny, nz) = if len > 0.0 {
            (
                nx as f32 / len as f32,
                ny as f32 / len as f32,
                nz as f32 / len as f32,
            )
        } else {
            (0.0f32, 0.0f32, 1.0f32)
        };

        file.write_all(&nx.to_le_bytes())
            .map_err(|e| format!("Erro: {}", e))?;
        file.write_all(&ny.to_le_bytes())
            .map_err(|e| format!("Erro: {}", e))?;
        file.write_all(&nz.to_le_bytes())
            .map_err(|e| format!("Erro: {}", e))?;

        // Vértices
        for v in &[v0, v1, v2] {
            file.write_all(&(v[0] as f32).to_le_bytes())
                .map_err(|e| format!("Erro: {}", e))?;
            file.write_all(&(v[1] as f32).to_le_bytes())
                .map_err(|e| format!("Erro: {}", e))?;
            file.write_all(&(v[2] as f32).to_le_bytes())
                .map_err(|e| format!("Erro: {}", e))?;
        }

        // Atributo (2 bytes, zero)
        file.write_all(&[0u8, 0u8])
            .map_err(|e| format!("Erro: {}", e))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_ascii() {
        let mesh = MeshData {
            vertices: vec![[0.0, 0.0, 0.0], [10.0, 0.0, 0.0], [10.0, 10.0, 0.0]],
            triangles: vec![[0, 1, 2]],
        };

        let path = Path::new("/tmp/test_cortacad.stl");
        export_stl_ascii(&mesh, path, "test").unwrap();
        assert!(path.exists());
        let content = fs::read_to_string(path).unwrap();
        assert!(content.starts_with("solid test"));
        assert!(content.contains("endsolid test"));
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn test_export_binary() {
        let mesh = MeshData {
            vertices: vec![[0.0, 0.0, 0.0], [10.0, 0.0, 0.0], [10.0, 10.0, 0.0]],
            triangles: vec![[0, 1, 2]],
        };

        let path = Path::new("/tmp/test_cortacad_bin.stl");
        export_stl_binary(&mesh, path).unwrap();
        assert!(path.exists());

        let metadata = fs::metadata(path).unwrap();
        // STL binário: 80 header + 4 num triangles + 50 bytes por triângulo
        assert_eq!(metadata.len(), 80 + 4 + 50);
        fs::remove_file(path).unwrap();
    }
}
