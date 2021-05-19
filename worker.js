const {
  Client,
  logger,
  Variables,
} = require("camunda-external-task-client-js");
const { leki, zamowioneleki } = require("./baza_danych.js");
const nodemailer = require("nodemailer");

const config = {
  baseUrl: "http://localhost:8080/engine-rest",
  use: logger,
  asyncResponseTimeout: 100,
};
const client = new Client(config);

client.subscribe(
  "check_warehouse_state",
  async function ({ task, taskService }) {
    console.log("Sprawdzanie stanu magazynowego...");
    var lacking_medicines = leki.filter((i) => i.ilosc == 0);

    const lacking_medicines_count = lacking_medicines.length;
    const processVariables = new Variables().set(
      "lmc",
      lacking_medicines_count
    );

    await taskService.complete(task, processVariables);
    console.log("Sprawdzono", lacking_medicines_count);
  }
);

client.subscribe("check_orders", async function ({ task, taskService }) {
  console.log("Sprawdzanie czy leki już zamówione");
  var lacking_medicines = leki.filter((i) => i.ilosc == 0);
  console.log(lacking_medicines);
  console.log(zamowioneleki);
  lacking_medicines = lacking_medicines.filter((i) =>
    !zamowioneleki.includes(i.nazwa)
  );
  var lacking_orders_names = "";
  lacking_medicines.forEach((element) => {
    lacking_orders_names += element.nazwa + " ";
  });
  const processVariables = new Variables()
    .set("lacking_orders", lacking_medicines.length)
    .set("lacking_orders_names", lacking_orders_names);
  await taskService.complete(task, processVariables);
});

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
      text: "Tutaj będą informacje o nadanej paczce",
    };
    var info = await transport.sendMail(opts);
    console.log(info);
    await taskService.complete(task);
  }
);

client.subscribe("send_message", async ({ task, taskService }) => {
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
    subject: "Brak podanych leków.",
    text: "Brak podanych leków. Jeśli będą zamienniki dostaniesz taką informację.",
  };
  var info = await transport.sendMail(opts);
  console.log(info);
  await taskService.complete(task);
});

//sprawdza dostępnosć leków w magazynie
client.subscribe("check_availability", async function ({ task, taskService }) {
  var code = task.variables.getAll()["code"];
  console.log(code);
  var drugs = code.split("I");

  drugs = drugs.filter(function (item) {
    return item !== "";
  });

  var errorFlag = 0;

  var medicines = [];
  for (i in drugs) {
    var item = drugs[i].split("A");
    var found = leki.find((i) => i.id == item[0]);
    if (found == null) {
      medicines.push({ id: item[0], status: "NOTOK", ile: item[1] });
      //await taskService.handleBpmnError(task, "1");
      errorFlag = 1;
    } else if (found.ilosc > item[1]) {
      medicines.push({ id: item[0], status: "OK", ile: item[1] });
    } else {
      medicines.push({ id: item[0], status: "NOTOK", ile: item[1] });
      //await taskService.handleBpmnError(task, "1");
      errorFlag = 1;
    }
  }

  const processVariables = new Variables().set("medicine_status", medicines);

  if (errorFlag == 1) {
    await taskService.handleBpmnError(task, "1", "Error", processVariables);
    return;
  }

  //console.log(medicines);
  await taskService.complete(task, processVariables);
});

//wskauje miejsce w magazynie z lekami
client.subscribe("show_place", async function ({ task, taskService }) {
  var code = task.variables.getAll()["code"];
  //console.log(code);
  var drugs = code.split("I");

  drugs = drugs.filter(function (item) {
    return item !== "";
  });

  var places = [];
  var total = 0;
  for (i in drugs) {
    var item = drugs[i].split("A");
    var found = leki.find((i) => i.id == item[0]);
    total += Number.parseInt(item[1]);
    places.push({ id: item[0], ile: item[1], pozycja: found.poz });
  }

  const processVariables = new Variables()
    .set("medicine_places", places)
    .set("medicine_amount", total);

  console.log(places);
  await taskService.complete(task, processVariables);
});

//sprawdza czy istnieje zamiennik leku
client.subscribe("check_replacement", async function ({ task, taskService }) {
  var medicine_status = task.variables.getAll()["medicine_status"];
  console.log(medicine_status);

  var new_code = "";
  console.log("Zamienniki");
  for (i in medicine_status) {
    if (medicine_status[i]["status"] == "NOTOK") {
      var oryginal_id = medicine_status[i]["id"];
      var found = leki.find((i) => i.id == oryginal_id);
      var ile = medicine_status[i]["ile"];

      var zam_id = found["zam"][0];
      var found_zam = leki.find((i) => i.id == zam_id);
      if (found["zam"][0] == null) {
        console.log("Nie ma zamiennika do tego leku");
        await taskService.handleBpmnError(task, "2");
      } else {
        var zam_id = found["zam"][0];
        var found_zam = leki.find((i) => i.id == zam_id);

        if (found_zam.ilosc < medicine_status[i]["ile"]) {
          console.log("Brak zamiennika w takiej ilości");
          await taskService.handleBpmnError(task, "2");
        } else
          new_code += "I" + found["zam"][0] + "A" + medicine_status[i]["ile"];
      }
    } else {
      new_code +=
        "I" + medicine_status[i]["id"] + "A" + medicine_status[i]["ile"];
    }
  }
  console.log(new_code);

  const processVariables = new Variables().set("code", new_code);

  //const processVariables = new Variables().set("medicine_amount", i+1);

  await taskService.complete(task, processVariables);
});
