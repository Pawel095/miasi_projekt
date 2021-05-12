const {
  Client,
  logger,
  Variables,
} = require("camunda-external-task-client-js");
const { leki } = require("./baza_danych.js");

const config = {
  baseUrl: "http://localhost:8080/engine-rest",
  use: logger,
  asyncResponseTimeout: 100,
};

const client = new Client(config);

client.subscribe(
  "remove_item_from_inventory",
  async ({ task, taskService }) => {
    console.log(leki);
    console.log(task.variables.getAll());
    const var1 = new Variables().set(
      "test1",
      "HELLO AND AGAIN WELCOME TO APERTURE SCIENCE COMPUTER AIDED ENRICHMENT CENTRE!"
    );
    await taskService.complete(task, var1);
  }
);
