import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  API_URL: {
    public: false,
    static: false,
    schema: (value: string | undefined) => value,
  },
});
