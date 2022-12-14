import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Bind } from '@nestjs/common';
import { Message } from '../entities/message.entity';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private chatService: ChatService) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: any) {
    console.log('Init', server);
  }

  handleConnection(socket: Socket) {
    const query = socket.handshake.query;
    console.log('Connect', query);
    this.chatService.userConnected(query.userName.toString(), query.registrationToken.toString());
  }

  handleDisconnect(socket: Socket) {
    const query = socket.handshake.query;
    console.log('Disconnect', socket.handshake.query);
    this.chatService.userDisconnected(query.userName.toString());
  }

  @Bind(MessageBody(), ConnectedSocket())
  @SubscribeMessage('chat')
  async handleNewMessage(
    @MessageBody() message: Message,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('New message', message);
    const query = client.handshake.query;
    message.senderEmail = query.userName.toString();
    await this.chatService.saveMessage(message);
    client.emit(`${message.recipientType}-${message.recipientId}`, message);
    client.broadcast.emit(
      `${message.recipientType}-${message.recipientId}`,
      message,
    );
    await this.chatService.sendMessageToOfflineUsers(message);
  }
}
