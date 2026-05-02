import { useEffect, useState } from "react";
import * as commands from "../commands";

export function useBackendStatus(): boolean {
  const [backendConnected, setBackendConnected] = useState(false);

  useEffect(() => {
    commands
      .ping()
      .then((res) => {
        if (res === "pong") setBackendConnected(true);
      })
      .catch(() => setBackendConnected(false));
  }, []);

  return backendConnected;
}
