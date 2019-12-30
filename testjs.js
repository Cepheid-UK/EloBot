var date = new Date()
var dateString = date.toISOString()

dateString = dateString.replace("Z"," ");
dateString = dateString.replace("T"," ");

console.log(dateString)