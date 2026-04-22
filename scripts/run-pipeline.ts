import { loadEnvConfig } from "@next/env";
import { runDailyPipeline } from "@/lib/pipeline/run-daily-pipeline";
import { startOfTodayLisbon } from "@/lib/utils/date";

loadEnvConfig(process.cwd());

runDailyPipeline(startOfTodayLisbon())
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
