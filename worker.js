const {
    Client,
    logger,
    Variables,
} = require("camunda-external-task-client-js");
const { leki, zamowioneleki } = require("./baza_danych.js");

const config = {
    baseUrl: "http://localhost:8080/engine-rest",
    use: logger,
    asyncResponseTimeout: 100,
};

const client = new Client(config);

client.subscribe("check_warehouse_state", async function ({ task, taskService }) {
    console.log('Sprawdzanie stanu magazynowego...');
    var lacking_medicines = leki.filter(i=>i.ilosc==0);
    
    const lacking_medicines_count = lacking_medicines.length;
    const processVariables = new Variables().set("lmc", lacking_medicines_count);

    await taskService.complete(task, processVariables);
    console.log('Sprawdzono', lacking_medicines_count)
});
client.subscribe("check_orders", async function ({ task, taskService }) {
    console.log('Sprawdzanie czy leki już zamówione');
    var lacking_medicines = leki.filter(i=>i.ilosc==0);
    console.log(lacking_medicines);
    console.log(zamowioneleki);
    lacking_medicines = lacking_medicines.filter(i=>zamowioneleki.includes(i.nazwa));
    var lacking_orders_names = "";
    lacking_medicines.forEach(element => {
        lacking_orders_names+= element.nazwa + " ";
    });
    const processVariables = new Variables().set("lacking_orders", lacking_medicines.length).set("lacking_orders_names",lacking_orders_names);
    await taskService.complete(task,processVariables);

});
