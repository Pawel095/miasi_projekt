const {
  Client,
  logger,
  Variables,
} = require("camunda-external-task-client-js");
const { leki } = require("./baza_danych.js");
const nodemailer = require("nodemailer");

const config = {
  baseUrl: "http://localhost:8080/engine-rest",
  use: logger,
  asyncResponseTimeout: 100,
};

const client = new Client(config);

client.subscribe(
  "remove_item_from_inventory",
  async ({ task, taskService }) => {
    const i = task.variables.get("loopCounter");
    let lista = task.variables.get("ListaLekow");

    let med = leki.filter((e) => parseInt(e.id) === parseInt(lista[i].id))[0];
    console.log(med);
    leki.map((e) => {
      if (e.id === med.id) {
        e.ilosc -= 1;
        console.log(e);
      }
      return e;
    });
    console.log(leki);
    await taskService.complete(task);
  }
);

client.subscribe(
  "SendEmailAboutPackageDetails",
  async ({ task, taskService }) => {

    const transport = nodemailer.createTransport({
      host: "127.0.0.1",
      port: "1025",
      auth: {
        user: "user",
        pass: "password",
      },
    });

    const opts = {
      from: "test@test.pl",
      to: "klient@test.pl",
      subject: "Przesyłka została wysłana",
      text:"Tutaj będą informacje o nadanej paczce"
    };
    var info = await transport.sendMail(opts);
    console.log(info)
    await taskService.complete(task);
  }
);
