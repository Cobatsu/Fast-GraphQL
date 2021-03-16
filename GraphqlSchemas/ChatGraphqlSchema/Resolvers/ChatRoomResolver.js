const { gql , withFilter , AuthenticationError , UserInputError , ForbiddenError , PubSub } = require('apollo-server');
const ChatRoom = require('../../../Models/ChatRoomModel');
const User = require('../../../Models/ChatUserModel');

const pubsub = new PubSub();

const chatRoomResolver = {
    
    Query:{

        getUserRooms:async (_, args , { user } )=>{

            if(!user) {
                throw new AuthenticationError("INVALID TOKEN");
            } else {
                const rooms = await ChatRoom.find({host:user._id})
                return rooms;
            }
        } , 

        getOtherRooms:async (_,args, { user })=>{

            if(!user) {
                throw new AuthenticationError("INVALID TOKEN");
            } else {

                const rooms = await ChatRoom.find({host:{$ne:user._id}})
                return rooms;
                
            }
        } ,


        getChatRoom:async (_,args, { user } )=>{

            if(!user) {
                throw new AuthenticationError("INVALID TOKEN");
            } else {

                const chatRoom = await ChatRoom.findById(args.roomID);

                return chatRoom;
                
            }
        
        }

    },

    Mutation:{

        createRoom: async (parent, { room } , { user } )=>{

            if(!user) {
                throw new AuthenticationError("INVALID TOKEN");
            } else {
                
                const newChatRoom = new ChatRoom({
                    ...room,
                    host:user._id,
                    memebers:[],
                    messages:[],
                })
      
                const createdRoom = await newChatRoom.save()
    
                return createdRoom;
            }

           
        } , 

        joinRoom: async (_, { roomID , memberLength , limit } , { user } )=>{
        
                if(!user) {

                   throw new AuthenticationError("INVALID TOKEN"); 

                } else {

                        const findRoom = await ChatRoom.findById(roomID);

                        if( findRoom.members.length < findRoom.limit ) {

                            if( findRoom.members.includes(user._id) ) {

                                throw new ForbiddenError("You Already In Room!"); 
    
                            }
    
                            pubsub.publish('MEMBER_JOINED_ROOM',{
        
                                memberJoined:{
                                    user,
                                    roomID
                                }
                              
                            });
                            
                            
                            pubsub.publish('MEMBER_JOINED_CHAT_ROOM',{
    
                                memberJoinedRoom:{
                                    ...user,
                                    roomID
                                }
    
                            });
        
                            const updated = await  ChatRoom.findOneAndUpdate( { _id:roomID } , {$push: { members: user._id } } );
        
                            return updated;

                        } else {

                            throw new ForbiddenError("Member Limit Is Reached"); 

                        }

                }

        } ,

        leaveRoom: async (_, { roomID } , { user } )=>{

            if(!user) {
                throw new AuthenticationError("INVALID TOKEN"); 
            } else {
                const leftRoom = await ChatRoom.findOneAndUpdate({ _id:roomID} , {$pull:{ members:user._id }});
                return leftRoom
            }
            
        } ,

        deleteMessage: async (_, { messageID , roomID } , { user })=>{

            if(!user) {

                throw new AuthenticationError("INVALID TOKEN"); 

            } else {

                const deleted = await ChatRoom.findById(roomID);
                
                const updatedData = deleted.messages.filter((msg)=>  msg._id != messageID )  

                const deletedMessage = deleted.messages.find((msg)=> msg._id == messageID )

                if( deletedMessage.owner != user._id ) {

                    throw new ForbiddenError("Forbidden!"); 

                }

                pubsub.publish('MESSAGE', {

                    message:{
                        _id:deletedMessage._id,
                        text:deletedMessage.text,
                        date:deletedMessage.date,
                        owner:user,
                        actionType:'DELETE',
                        roomID
                    }

                })

                deleted.messages = updatedData;

                await deleted.save(); // we can update data after using find function 

                return deletedMessage;

            }

        },
        sendMessage: async (_, { roomID , text } , { user } )=>{
      
            if(!user) {

                throw new AuthenticationError("INVALID TOKEN"); 

            } else {

                await ChatRoom.findOneAndUpdate( {_id:roomID} , {$push: { messages: { 

                    date:new Date(),
                    text,
                    owner:user._id

                }}})

                const updatedData = await ChatRoom.findById(roomID);
                const lastMessage = updatedData.messages[updatedData.messages.length-1];

                pubsub.publish( 'MESSAGE' , {

                    message:{
                        _id:lastMessage._id,
                        text:text,
                        date:new Date(),
                        owner:user,
                        actionType:'SEND',
                        roomID
                    }

                })

                return lastMessage;

            }

        }

    },
    Room:{

        host: async (parent)=>{

            const result = await User.findById(parent.host); // no need for object structure
            return result

        },

        members: async (parent)=>{

            const result = await User.find( { _id: { $in: [...parent.members] } });
            return result
            
        },

    },

    Message:{

        owner: async (parent)=>{
            const result = await User.findById(parent.owner)
            return result;
        },

        date:(parent)=>{  // to modify a single field we can use these functions too
            
            const newDate = new Date(parent.date)  
            const editedTime = newDate.getHours() + ":" +  ( newDate.getMinutes().toString().length == 1 ? '0'+ newDate.getMinutes() : newDate.getMinutes() )

            return editedTime;

        }

    },

    Subscription: {

        memberJoined: {
            
            subscribe: () => pubsub.asyncIterator(['MEMBER_JOINED_ROOM'])
            
        },

        message: {

            subscribe: withFilter( 
            
            () => pubsub.asyncIterator('MESSAGE'),
            (payload,args)=>{

                return args.roomID ==  payload.message.roomID

            })

        },

      
        memberJoinedRoom: {

            subscribe: withFilter( 
            
                () => pubsub.asyncIterator('MEMBER_JOINED_CHAT_ROOM'),
                (payload,args)=>{
                    
                    console.log("hello");

                    return args.roomID ==  payload.memberJoinedRoom.roomID
    
                }
            )

        }


    }

}

module.exports = chatRoomResolver;