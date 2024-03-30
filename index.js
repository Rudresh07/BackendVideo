const http = require("http");
const Socket = require("websocket").server;

const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Handling OPTIONS method for preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Your WebSocket server logic here
});

const webSocket = new Socket({ httpServer: server });

const users = [];

webSocket.on('request', (req) => {
    const connection = req.accept();

    connection.on('message', (message) => {
        const data = JSON.parse(message.utf8Data);
        console.log(data);
        const user = findUser(data.name);

        switch (data.type) {
            case "store_user":
                if (user != null) {
                    //our user exists
                    connection.send(JSON.stringify({
                        type: 'user already exists'
                    }));
                    return;
                }

                const newUser = {
                    name: data.name, conn: connection
                };
                users.push(newUser);
                break;

            case "start_call":
                let userToCall = findUser(data.target);

                if (userToCall) {
                    connection.send(JSON.stringify({
                        type: "call_response", data: "user is ready for call"
                    }));
                } else {
                    connection.send(JSON.stringify({
                        type: "call_response", data: "user is not online"
                    }));
                }

                break;

            case "create_offer":
                let userToReceiveOffer = findUser(data.target);

                if (userToReceiveOffer) {
                    userToReceiveOffer.conn.send(JSON.stringify({
                        type: "offer_received",
                        name: data.name,
                        data: data.data.sdp
                    }));
                }
                break;

            case "create_answer":
                let userToReceiveAnswer = findUser(data.target);
                if (userToReceiveAnswer) {
                    userToReceiveAnswer.conn.send(JSON.stringify({
                        type: "answer_received",
                        name: data.name,
                        data: data.data.sdp
                    }));
                }
                break;

            case "ice_candidate":
                let userToReceiveIceCandidate = findUser(data.target);
                if (userToReceiveIceCandidate) {
                    userToReceiveIceCandidate.conn.send(JSON.stringify({
                        type: "ice_candidate",
                        name: data.name,
                        data: {
                            sdpMLineIndex: data.data.sdpMLineIndex,
                            sdpMid: data.data.sdpMid,
                            sdpCandidate: data.data.sdpCandidate
                        }
                    }));
                }
                break;
        }
    });

    connection.on('close', () => {
        users.forEach(user => {
            if (user.conn === connection) {
                users.splice(users.indexOf(user), 1);
            }
        });
    });
});

const findUser = (username) => {
    for (let i = 0; i < users.length; i++) {
        if (users[i].name === username)
            return users[i];
    }
};

server.listen(3300, () => {
    console.log('WebSocket server is listening on port 3300');
});
