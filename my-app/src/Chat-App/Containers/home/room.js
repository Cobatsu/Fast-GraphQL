import React, {useEffect , useState} from 'react';
import { useSubscription , useQuery , useMutation } from '@apollo/client'
import { GET_CHAT_ROOM_QUERY } from '../../GraphqQL/Queries/ChatRoomQuery'
import { SEND_MESSAGE_MUTATION , MESSAGE_SENT , MEMBER_JOINED_ROOM_CHAT_ROOM } from '../../GraphqQL/Mutations/CatchRoomMutation'
import styled from 'styled-components';
import { useSelector , useDispatch } from 'react-redux';


const GeneralWrapper = styled.div`
    display:flex;
    justify-content:center;
    align-items:center;
    height:100%;
    width:88%;
    margin:0 auto;
`


const ChatBox = styled.div`

    height:530px;
    box-shadow: rgba(0, 0, 0, 0.25) 0px 0.0625em 0.0625em, rgba(0, 0, 0, 0.25) 0px 0.125em 0.5em, rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
    align-items:center;
    box-sizing: border-box;
    flex:0.5;
    margin-left:30px;
    padding:10px;

`
const Members = styled.div`

    box-shadow: rgba(0, 0, 0, 0.25) 0px 0.0625em 0.0625em, rgba(0, 0, 0, 0.25) 0px 0.125em 0.5em, rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset;
    height:530px;
    flex:0.20;
    display:flex;
    flex-direction:column;
    border-radius:8px;
    align-items:center; 
    box-sizing: border-box;
    padding:10px;

`
//................................

const TextPart = styled.div`
    display:flex;
    width:100%;
    flex:0.06;
`

const ChatTextInput = styled.input`

    flex:0.85;
    padding:2px;
    height:30px;
    font-size:15px;

`

const Send = styled.button`

    background:#28527a;
    color:white;
    border:none;
    flex:0.15;
    &:hover{
        cursor:pointer
    }
`

const Messages = styled.ul`
    
 flex:0.94;
 width:100%;
 display:flex;
 flex-direction:column;
 list-style: none;
 padding:0;
 overflow:scroll;
 overflow-x: hidden;
`

const InnerMessage = styled.li`

 width:100%;
 display:flex;
 list-style: none;
 flex-direction:${ ({checkOwner})=> checkOwner ? 'row' : 'row-reverse'}; 
 justify-content:flex-end;
 padding:5px 15px 5px 15px;
 box-sizing: border-box;

`

const TextBubble = styled.span`
 background:#03506f;
 color:white;
 padding:6px;
 border-radius:5px;

`

const TextInformationBubble = styled.span`

display:flex;
flex-direction:column;
font-size:12px;
padding:0 7px;
align-items:center;

`


const Room = ({match})=>{

    const { data , loading , error , subscribeToMore } = useQuery(GET_CHAT_ROOM_QUERY,{
        fetchPolicy:"network-only",
        variables:{
            roomID:match.params.id
        }
    });

    const [ send ] = useMutation(SEND_MESSAGE_MUTATION)
    const currentUser = useSelector((state = {}) => state.user);
    
    const sendMessage = ()=>{

        if(chatText.value) {

            send({
                variables:{
                        text:chatText.value || null,
                        roomID:match.params.id || null
                }
            })

        }

    }

    useEffect(()=>{

        subscribeToMore({
            variables:{
                roomID:match.params.id
            },
            document:MESSAGE_SENT,
            updateQuery:(prev, { subscriptionData })=>{

                const subMessage = subscriptionData.data.messageSent;
                
                const updatedData = Object.assign({},prev.getChatRoom,{ // object assign mutates the original object !

                    messages:{
                        subMessage , ...prev.getChatRoom.messages
                    }

                }) // this updates the present value

                return {
                    getChatRoom:updatedData
                }

            }
        })


        subscribeToMore({
            variables:{
                roomID:match.params.id
            },
            document:MEMBER_JOINED_ROOM_CHAT_ROOM,
            updateQuery:(prev,{subscriptionData})=>{

                const joinedMember = subscriptionData.data.memberJoinedRoom.user;
                console.log(joinedMember);
                const updatedData = Object.assign({},prev.getChatRoom,{

                    members:{
                        joinedMember,...prev.getChatRoom.members
                    }

                })

                return {
                    getChatRoom:updatedData
                }

            }
        })

    },[])

    let chatText;

    return <GeneralWrapper> 
        
            
            <Members>

                <span style={{color:"#845ec2",fontWeight:"600",letterSpacing:1}}> GROUP MEMBERS </span>

                <ul style={{ padding:0,listStyle:"none" , width:"50%" , marginTop:30 }}>

                    {
                        data && data.getChatRoom.members.map((member)=>{

                            return (

                            <li style={{padding:5,width:"100%",display:"flex",fontSize:17.5,justifyContent:"center"}} key={member._id} > 

                                {member.username} 
                                <i className="fas fa-user" style={{color:"#f14668",marginLeft:14}}></i>
                                
                                
                            </li>

                        )})
                        
                    }

                </ul>

            </Members>

            <ChatBox>

                     { loading ? " Messages are loading...."  : <Messages>


                        {
                                data && data.getChatRoom.messages.map((msg,index)=>{

                                    const newDate = new Date(parseInt(msg.date)) // it must be integer to be converted into Date format ! 
                                    const editedTime = newDate.getHours() + ":" +  ( newDate.getMinutes().toString().length == 1 ? '0'+ newDate.getMinutes() : newDate.getMinutes() )

                                        return (
                                        
                                        <InnerMessage key={index} checkOwner={ msg.owner._id == currentUser._id } > {/* row-reverse also reverses the end and start property */}

                                            <TextInformationBubble>

                                                <span style={{color:"blue"}}> {msg.owner.username} </span>
                                                <span>  {editedTime} </span>

                                            </TextInformationBubble>

                                            <TextBubble>  

                                                {msg.text}

                                            </TextBubble>

                                        </InnerMessage> 
                                        
                                    )
                                })
                        }

                     </Messages> }

                    <TextPart>

                            <ChatTextInput ref={ ref => chatText = ref }/>
                            <Send onClick={sendMessage} > SEND </Send>

                    </TextPart>
                   

            </ChatBox>
        
    </GeneralWrapper>


}

export default Room;