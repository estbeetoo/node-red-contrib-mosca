/**
 * Copyright 2013,2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var RED = require(process.env.NODE_RED_HOME + "/red/red");
var mosca = require('mosca');

function MoscaInNode(n) {
    RED.nodes.createNode(this, n);
    this.dburl = n.dburl ? n.dburl.toString() : '';
    this.mqtt_port = parseInt(n.mqtt_port);
    this.mqtt_ws_port = parseInt(n.mqtt_ws_port);
    var moscaSettings = {
        interfaces: []
    };

    if (this.mqtt_port)
        moscaSettings.interfaces.push({type: "mqtt", port: this.mqtt_port});
    if (this.mqtt_ws_port)
        moscaSettings.interfaces.push({type: "http", port: this.mqtt_ws_port});
    //TODO: read https://github.com/mcollina/mosca/blob/master/lib/server.js and add support of mqtts and wss

    var node = this;
    node.log("Binding mosca mqtt server on port: " + this.mqtt_port);
    var server = new mosca.Server(moscaSettings, function (err) {
        if (err) {
            err.msg = 'Error binding mosca mqtt server, cause: ' + err.toString();
            node.error(err);
        }
    });

    server.on('clientConnected', function (client) {
        var msg = {
            topic: "clientConnected",
            payload: client
        };
        node.send(msg);
    });

    server.on('clientDisconnected', function (client) {
        var msg = {
            topic: "clientDisconnected",
            payload: client
        };
        node.send(msg);
    });

    server.on('published', function (packet, client) {
        var msg = {
            topic: "published",
            payload: {
                packet: packet,
                client: client
            }
        };
        node.send(msg);
    });

    server.on('subscribed', function (topic, client) {
        var msg = {
            topic: "subscribed",
            payload: {
                topic: topic,
                client: client
            }
        };
        node.send(msg);
    });

    server.on('unsubscribed', function (topic, client) {
        var msg = {
            topic: "unsubscribed",
            payload: {
                topic: topic,
                client: client
            }
        };
        node.send(msg);
    });

    this.on('close', function () {
        node.log("Unbinding mosca mqtt server from port: " + this.port);
        server.close();
        server.removeAllListeners('clientConnected');
        server.removeAllListeners('clientDisconnected');
        server.removeAllListeners('published');
        server.removeAllListeners('subscribed');
        server.removeAllListeners('unsubscribed');
        
    });
    if (this.dburl) {
        var onPersistenceReady = function () {
            node.log('Persistence Ready');
            persistence.wire(server);
        }

        var persistenceOpts = {
            url: this.dburl
        }
        var persistence = mosca.persistence.Mongo(persistenceOpts, onPersistenceReady);
    }
}
RED.nodes.registerType("mosca in", MoscaInNode);