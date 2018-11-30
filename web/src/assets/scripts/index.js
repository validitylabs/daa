import '../styles/index.scss';

import './masonry';
import './charts';
import './popover';
import './scrollbar';
import './search';
import './sidebar';
import './skycons';
import './vectorMaps';
import './chat';
import './datatable';
import './datepicker';
import './email';
import './fullcalendar';
import './googleMaps';
import './utils';

$(window).on('load', function() {

    // var contractAddress  = "0x915b5929f44b97bd99b5166f3747a07ff6e5b168"; // in Ropsten testnet!
    var contractAddress  = "0x7ddb2ed491e6230165c5a562b7cb6b6f4c18ac1c"; // in Ropsten testnet!

    var contractABI = [
        {
            "constant": true,
            "inputs": [],
            "name": "get9090",
            "outputs": [
                {
                    "name": "_p",
                    "type": "uint8"
                },
                {
                    "name": "_dir",
                    "type": "bool"
                },
                {
                    "name": "_e",
                    "type": "uint32"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "_id",
                    "type": "uint256"
                }
            ],
            "name": "get8080",
            "outputs": [
                {
                    "name": "_p",
                    "type": "int8"
                },
                {
                    "name": "_ti",
                    "type": "uint32"
                },
                {
                    "name": "_te",
                    "type": "uint32"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "get7070",
            "outputs": [
                {
                    "name": "",
                    "type": "uint8"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_mc",
                    "type": "uint8"
                }
            ],
            "name": "read7070",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_id",
                    "type": "uint256"
                },
                {
                    "name": "_p",
                    "type": "int8"
                },
                {
                    "name": "_ti",
                    "type": "uint32"
                },
                {
                    "name": "_te",
                    "type": "uint32"
                }
            ],
            "name": "read8080",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_p",
                    "type": "uint8"
                },
                {
                    "name": "_dir",
                    "type": "bool"
                },
                {
                    "name": "_e",
                    "type": "uint32"
                }
            ],
            "name": "read9090",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "constructor"
        }
    ]

    var url_string_7070 = 'http://www.wikiproofs.org:7070/api/status';
    var url_string_8080 = 'http://www.wikiproofs.org:8080/last/11';
    var url_string_9090 = 'http://www.wikiproofs.org:9090/api/status';
    var input_7 = null;
    var input_8 = null;
    var input_9 = null;

    var all_inputs = {
        7 : [
            {
                "url_string" : url_string_7070,
                "jbody" : input_7
            }
        ],
        8 : [
            {
            "url_string" : url_string_8080,
            "jbody" : input_8
            }
        ],
        9 : [
            {
                "url_string" : url_string_9090,
                "jbody" : input_9
            }
        ]

    }

    getAllRequest(all_inputs);
    
    // Checking if Web3 has been injected by the browser (Mist/MetaMask)
    if (typeof web3 != 'undefined') {
        // Use Mist/MetaMask's provider
        $('#content').text('I have web3!!!');
        window.web3 = new Web3(web3.currentProvider);
    } else {
        var errorMsg = 'I don\'t has web3 :( Please open in Google Chrome Browser and install the Metamask extension.';
        $('#content').text(errorMsg);
        console.log(errorMsg);
        return;
    }

    var contractInstance = web3.eth.contract(contractABI).at(contractAddress);
    $('#log').text('You are communication with the contract factory at address: ' + contractAddress);

    $("#get7070").on('click', function(){
        var data_7070 = parseInt($('#data_7070').text(), 10);
        console.log("data is " + data_7070);
        contractInstance.read7070(data_7070, function(error, txHash) {
            if (error) {
                console.log("No such contract found");
                return;
            } else {
                $('#note').text('Your transaction hash is: ' + txHash);
                console.log("The transaction hash is: " + txHash);
            }
        });
    });

    $("#get8080").on('click', function(){
        var data_8080_0 = parseInt($('#data_8080_0').text(), 10);
        var data_8080_1 = parseInt($('#data_8080_1').text(), 10);
        var data_8080_2 = parseInt($('#data_8080_2').text(), 10);
        var temp = all_inputs[8][0]["jbody"]["UniqueId"].slice(10);
        var _id = parseInt(temp, 10);

        console.log(temp);
        console.log("data is " + data_8080_0 + '\n' + data_8080_1 + '\n' + data_8080_2);
        contractInstance.read8080(_id, data_8080_0, data_8080_1, data_8080_2, function(error, txHash) {
            if (error) {
                console.log("No such contract found");
                return;
            } else {
                $('#note').text('Your transaction hash is' + txHash);
                console.log("The transaction hash is: " + txHash);
            }
        });
    });

    $("#get9090").on('click', function(){
        var data_9090_0 = parseInt($('#data_9090_0').text(), 10);
        var data_9090_1 = parseInt($('#data_9090_1').text(), 10);


        if (all_inputs[9][0]["jbody"]["status"]["flowdirection"] == "+A") {
            var data_9090_2 = true;
        } else {
            var data_9090_2 = false;
        }

        console.log(data_9090_2);

        contractInstance.read9090(data_9090_0, data_9090_2, data_9090_1, function(error, txHash) {
            if (error) {
                console.log("No such contract found");
                return;
            } else {
                $('#note').text('Your transaction hash is' + txHash);
                console.log("The transaction hash is: " + txHash);
            }
        });
    });


});

function cb(error, response) {
    // callback as helper function for debugging purposes
    console.log('error: ' + error + ', response: ' + response);
}

    
function createCORSRequest(method, url){
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr){
        // XHR has 'withCredentials' property only if it supports CORS
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != "undefined"){ // if IE use XDR
        xhr = new XDomainRequest();
        xhr.open(method, url);
    } else {
        xhr = null;
    }
    return xhr;
}

function makeCorsRequest(element, url, callback) {
    var request = createCORSRequest( 'GET', url);
    if (!request) {
        alert('CORS not supported');
    } else {
        // Define a callback function
        request.onload = function(temp) {
            var responseText = request.responseText;
            // process the response.
            element = JSON.parse(responseText);
            // console.log(element);
            callback(element);
        };

        request.onerror = function() {
            console.log('There was an error!');
        };

        // Send request
        request.send();
    }
}

// funciton displayValue(gateNum, element) {
//     if (_element["jbody"]["Errors"] != undefined) {
//         $('#data_7070').text(_element["jbody"]["MaxChargeCurrentA"]);
//     } else {
        
//     }
// }

function getAllRequest(element) {
    var getAPIrequest = [];

    for (var gate_num in element) {
        for (var sensor_id in element[gate_num]) {
            console.log(gate_num + sensor_id);
            (function (_element) {
                getAPIrequest.push(makeCorsRequest(_element["jbody"], _element["url_string"], function(elementJBody){
                    _element["jbody"] = elementJBody;
                    if (elementJBody["Errors"] != undefined) {
                        if (elementJBody["Errors"]["StateF"] == false) {
                            $('#status_gate_7070').text("Online");
                            parent.document.getElementById('status_gate_7070').className = "d-ib lh-0 va-m fw-600 bdrs-10em pX-15 pY-15 bgc-green-50 c-green-500";
                            //
                            $('#data_7070').text(_element["jbody"]["MaxChargeCurrentA"]);
                        } else {
                            $('#status_gate_7070').text("Offline");
                            parent.document.getElementById('status_gate_7070').className = "d-ib lh-0 va-m fw-600 bdrs-10em pX-15 pY-15 bgc-red-50 c-red-500";
                        }
                        console.log(elementJBody["Errors"]["StateF"]);
                    } else if (elementJBody["TotalImport"] != undefined) {
                        if (elementJBody["TotalImport"] != 0 || elementJBody["TotalExport"] != 0) {
                            $('#status_gate_8080').text("Online");
                            parent.document.getElementById('status_gate_8080').className = "d-ib lh-0 va-m fw-600 bdrs-10em pX-15 pY-15 bgc-green-50 c-green-500";
                            $('#data_8080_0').text( _element["jbody"]["Power"]["L1"]);
                            $('#data_8080_1').text( _element["jbody"]["TotalImport"]);
                            $('#data_8080_2').text( _element["jbody"]["TotalExport"]);
                        } else {
                            $('#status_gate_8080').text("Offline");
                            parent.document.getElementById('status_gate_8080').className = "d-ib lh-0 va-m fw-600 bdrs-10em pX-15 pY-15 bgc-red-50 c-red-500";
                        }
                        console.log(elementJBody["TotalImport"], elementJBody["TotalExport"]);
                    // } else if (elementJBody["UptimeSeconds"] != undefined) {
                    //     if (elementJBody["UptimeSeconds"] > 0) {
                    //         $('#status_gate_8080').text("Online");
                    //         parent.document.getElementById('status_gate_8080').className = "d-ib lh-0 va-m fw-600 bdrs-10em pX-15 pY-15 bgc-green-50 c-green-500";
                    //     } else {
                    //         $('#status_gate_8080').text("Offline");
                    //         parent.document.getElementById('status_gate_8080').className = "d-ib lh-0 va-m fw-600 bdrs-10em pX-15 pY-15 bgc-red-50 c-red-500";
                    //     }
                    //     console.log(elementJBody["TotalImport"], elementJBody["TotalExport"]);
                    } else if (elementJBody["status"] != undefined) {
                        if (elementJBody["status"]["error"] == false) {
                            $('#status_gate_9090').text("Online");
                            parent.document.getElementById('status_gate_9090').className = "d-ib lh-0 va-m fw-600 bdrs-10em pX-15 pY-15 bgc-green-50 c-green-500";
                            $('#data_9090_0').text( _element["jbody"]["1-0:15.7.0*255"]);
                            $('#data_9090_1').text( _element["jbody"]["1-0:2.8.0*255"]);
                            if ( _element["jbody"]["status"]["flowdirection"] == "+A") { 
                                $('#data_9090_2').text("true");
                            } else {
                                $('#data_9090_2').text("false");
                            }
                        } else {
                            $('#status_gate_9090').text("Offline");
                            parent.document.getElementById('status_gate_9090').className = "d-ib lh-0 va-m fw-600 bdrs-10em pX-15 pY-15 bgc-red-50 c-red-500";
                        }
                        console.log(elementJBody["status"]["error"]);
                    // }
                    } else {
                        console.log(elementJBody);
                        console.log(_element["url_string"]);
                        alert("WRONG!");
                    }
                }));
            })(element[gate_num][sensor_id]);
        }
      }
    
    return Promise.all(getAPIrequest)
}
