
import {
  getApp,
  getApps,
  initializeApp,
  applicationDefault,
  type App,
} from "firebase-admin/app";

import {
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";

import fs from "node:fs";
import path from "node:path";

let firestore: Firestore | null = null;

export function getVeloraFirestore(): Firestore {
  if (firestore) return firestore;

  const configPath = path.resolve(
    process.cwd(),
    "firebase-applet-config.json"
  );

  let projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() || "";

  if (!projectId && fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(
        fs.readFileSync(configPath, "utf8")
      ) as { projectId?: string };

      projectId = config.projectId?.trim() || "";
    } catch {
      // Ignore invalid config.
    }
  }

  if (!projectId) {
    throw new Error(
      "Firestore is not configured: set FIREBASE_PROJECT_ID."
    );
  }

  let app: App;

  if (getApps().length) {
    app = getApp();
  } else {
    app = initializeApp({
      projectId,
      credential: applicationDefault(),
    });
  }

  firestore = getFirestore(app);

  return firestore;
}
