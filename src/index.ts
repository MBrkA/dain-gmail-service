import { dainService } from "./service";

/**
 * Start the DAIN Service test
 */
(async () => {
  await dainService.startNode({ port: 2022 });
  console.log("Service started on port 2022");
})();
