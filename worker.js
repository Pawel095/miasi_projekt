const { Client, logger } = require("camunda-external-task-client-js");
const open = require("open");
const {leki } = require("./baza_danych.js")
const config = {
  baseUrl: "http://localhost:8080/engine-rest",
  use: logger,
  asyncResponseTimeout: 10000,
};



const client = new Client(config);
client.subscribe("check_availability", async function ({ task, taskService }) {

  var code = task.variables.getAll()["code"];
  console.log(code);
  var drugs = code.split('I');

  drugs = drugs.filter(function(item) {
    return item !== ""})

  var medicines = [];
  for(i in drugs)
  {
    var item = drugs[i].split('A');
    var finded = leki.find(i=>i.id==item[0]);
    if(finded==null){
      medicines.push({id: item[0], status: "NOTOK"});
      await taskService.handleBpmnError(task, "1");
    }
    else if(finded.ilosc>item[1]){
      medicines.push({id: item[0], status: "OK"});
    }
    else{
      medicines.push({id: item[0], status: "NOTOK"});
      await taskService.handleBpmnError(task, "1");
    }
  }

  console.log(medicines);
  await taskService.complete(task);

})

client.subscribe("show_place", async function ({ task, taskService }) {

  var code = task.variables.getAll()["code"];
  console.log(code);
  var drugs = code.split('I');

  drugs = drugs.filter(function(item) {
    return item !== ""})

  var places = [];
  for(i in drugs)
  {
    var item = drugs[i].split('A');
    var finded = leki.find(i=>i.id==item[0]);

    places.push({id: item[0], ile: item[1], pozycja: finded.poz});
  }

  //const processVariables = new Variables().set("medicine_amount", i+1);

  console.log(places);
  await taskService.complete(task);

})