import type { ModelEntry } from "./types";

/* Higgsfield Platform "Marketing Studio Image": campaign stills, up to 16
   reference images (product shots, brand refs). Endpoint marketing-studio/image,
   documented at docs.higgsfield.ai/docs/models/marketing-studio-image.
   Custom mapper in to-platform.ts because the platform takes a `quality` field
   the shared path mapper does not send. Enhanced mode (preset_id) is not wired. */
export const marketingStudioImage: ModelEntry = {
  id: "marketing-studio-image",
  surface: "image",
  label: "Marketing Studio Image",
  roles: { reference: 16 },
  settings: {
    aspectRatio: {
      type: "enum",
      values: ["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9"],
      default: "4:3",
    },
    resolution: { type: "enum", values: ["1k", "2k", "4k"], default: "2k" },
    quality: { type: "enum", values: ["low", "medium", "high"], default: "high" },
  },
};
