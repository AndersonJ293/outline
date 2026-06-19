use std::fs;
use std::path::Path;

/// Represents a 3D triangle mesh
#[derive(Debug, Clone)]
pub struct MeshData {
    pub vertices: Vec<[f64; 3]>,
    pub triangles: Vec<[u32; 3]>,
}

/// Exports mesh as ASCII STL
pub fn export_stl_ascii(mesh: &MeshData, output_path: &Path, name: &str) -> Result<(), String> {
    let mut stl = String::new();

    stl.push_str(&format!("solid {}\n", name));

    for tri in &mesh.triangles {
        let v0 = mesh.vertices[tri[0] as usize];
        let v1 = mesh.vertices[tri[1] as usize];
        let v2 = mesh.vertices[tri[2] as usize];

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

    fs::write(output_path, stl).map_err(|e| format!("Failed to write STL: {}", e))?;

    Ok(())
}

/// Exports mesh as binary STL (more compact)
pub fn export_stl_binary(mesh: &MeshData, output_path: &Path) -> Result<(), String> {
    use std::io::Write;

    let mut file =
        fs::File::create(output_path).map_err(|e| format!("Failed to create STL: {}", e))?;

    let header = b"Outline STL Export";
    file.write_all(&header[..])
        .map_err(|e| format!("Failed to write header: {}", e))?;
    for _ in header.len()..80 {
        file.write_all(&[0u8])
            .map_err(|e| format!("Failed to write header: {}", e))?;
    }

    let num_triangles = mesh.triangles.len() as u32;
    file.write_all(&num_triangles.to_le_bytes())
        .map_err(|e| format!("Failed to write triangle count: {}", e))?;

    // Each triangle: normal (3x f32) + 3 vertices (3x f32 each) + 2 attribute bytes
    for tri in &mesh.triangles {
        let v0 = mesh.vertices[tri[0] as usize];
        let v1 = mesh.vertices[tri[1] as usize];
        let v2 = mesh.vertices[tri[2] as usize];

        // Normal (cross product)
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
            .map_err(|e| format!("Write failed: {}", e))?;
        file.write_all(&ny.to_le_bytes())
            .map_err(|e| format!("Write failed: {}", e))?;
        file.write_all(&nz.to_le_bytes())
            .map_err(|e| format!("Write failed: {}", e))?;

        // Vertices
        for v in &[v0, v1, v2] {
            file.write_all(&(v[0] as f32).to_le_bytes())
                .map_err(|e| format!("Write failed: {}", e))?;
            file.write_all(&(v[1] as f32).to_le_bytes())
                .map_err(|e| format!("Write failed: {}", e))?;
            file.write_all(&(v[2] as f32).to_le_bytes())
                .map_err(|e| format!("Write failed: {}", e))?;
        }

        // Attribute (2 bytes, zero)
        file.write_all(&[0u8, 0u8])
            .map_err(|e| format!("Write failed: {}", e))?;
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

        let path = Path::new("/tmp/test_outline.stl");
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

        let path = Path::new("/tmp/test_outline_bin.stl");
        export_stl_binary(&mesh, path).unwrap();
        assert!(path.exists());

        let metadata = fs::metadata(path).unwrap();
        // Binary STL: 80-byte header + 4 num triangles + 50 bytes per triangle
        assert_eq!(metadata.len(), 80 + 4 + 50);
        fs::remove_file(path).unwrap();
    }
}
