import { dainService } from "./service";

/**
 * Start the DAIN Service
 */
(async () => {
  await dainService.startNode({ port: 2022 });
  console.log("Service started on port 2022");
})();
