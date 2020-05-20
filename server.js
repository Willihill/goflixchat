const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const server = require("http").createServer(app);
const io = require('socket.io')(server, {
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: false
});

const api = require("axios").create({
    baseURL: "https://goflix.azurewebsites.net/api"
})

app.use(cors());
app.use(express.static(path.join(__dirname, 'publish')));
app.set('views', path.join(__dirname, 'public'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use('/', (req, res) => {
    res.render('index.html');
});

let isCon = false;

let users = [];


server.close()

io.on('connection', (socket) => {

    socket.on('setUser', (data) => {
        socket.userId = data.id;
        socket.userName = data.name;

        //console.log(`${data.name} (${data.id}) de connectou.`)
        console.log(`${socket.userName} (${socket.userId}) de connectou.`);

        users.push({
            socket: socket,
            userId: socket.userId
        })
    });

    socket.on('message', (data) => {
        console.log(`Nova mesagem: ${data.message}`);

        // Chamando Api para salvar
        api.post(`/Chat/${data.chatId}/Message`,
            {
                message: data.message,
                fromUser: socket.userId
            })
        .then(
            (resp) => {
                const emitMessage = {
                    message: data.message,
                    date: resp.data.date
                }

                // Percorrendo os usuarios para envia-lo a mensagem
                //console.log(`Percorrendo usuarios: ${users.length}`);
                users.forEach( ele => {
                    console.log(`Verificando usuario ${ele.userId} para (${data.to})`);
                    if(ele.userId === data.to){
                        ele.socket.emit('receivedMessage', emitMessage); 
                    }

                });

                // Envia notificação para o usuario da mensagem, informando que salvou com sucesso
                socket.emit('statusMessageSent', emitMessage);
            },

            (reject) => {
                console.log("Erro ao salvar message na api: ", reject.response.data.message, reject);
            }
        )
    });


    socket.on('disconnect', (reason) => {
        users = users.filter( sock => sock.userId !== socket.userId);
        console.log(`${socket.userName} (${socket.userId}) de desconnectou.`);
        //socket.close();
    });

    socket.on('reconnect', (reason) => {
        console.log(`${socket.userName} (${socket.userId}) de reconnectou.`);
    });

});

server.listen(process.env.PORT || 3000);