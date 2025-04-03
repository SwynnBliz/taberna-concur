import { useState, useEffect, useRef } from "react";
import { firestore } from "../app/firebase/config";
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { formatDistanceToNow } from 'date-fns';
import { FaCommentAlt, FaTimes, FaEdit, FaPaperPlane, FaTrash } from "react-icons/fa";
import { BiChevronsDown } from "react-icons/bi";

interface Message {
  userId: string;
  text: string;
  timestamp: any;
  messageId: string;
  isEdited: boolean;
  isDeleted?: boolean;
}

interface ChatProps {
  projectId: string;
  userId: string;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Chat = ({ projectId, userId, isOpen, setIsOpen }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<Map<string, { username: string; profilePhoto: string }>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Fetch and listen for messages from the project document in real-time
  useEffect(() => {
    const projectRef = doc(firestore, "projects", projectId);

    const unsubscribe = onSnapshot(projectRef, (projectSnapshot) => {
      const projectData = projectSnapshot.data();
      if (projectData?.messages) {
        setMessages(projectData.messages);
      }
    });

    return () => unsubscribe();
  }, [projectId]);

  // Fetch all usernames from Firestore (called in useEffect)
  useEffect(() => {
    const fetchUserNames = async () => {
      const usersRef = doc(firestore, "users", userId);
      const userSnapshot = await getDoc(usersRef);
      if (userSnapshot.exists()) {
        setUserNames((prevState) =>
          new Map(prevState.set(userId, userSnapshot.data().username || "Unknown User"))
        );
      }
    };

    fetchUserNames();
  }, [userId]);

  // Fetch usernames for all users in the project
  useEffect(() => {
    const fetchAllUsernames = async () => {
      const usersRef = doc(firestore, "projects", projectId);
      const projectSnapshot = await getDoc(usersRef);
      const projectData = projectSnapshot.data();
      if (projectData?.members) {
        const memberUsernames: Map<string, { username: string, profilePhoto: string }> = new Map();
        for (const memberId of projectData.members) {
          const userSnapshot = await getDoc(doc(firestore, "users", memberId));
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            memberUsernames.set(memberId, {
              username: userData.username || "Unknown User",
              profilePhoto: userData.profilePhoto || "",
            });
          }
        }
        setUserNames(memberUsernames); // This should now work correctly
      }
    };
  
    fetchAllUsernames();
  }, [projectId]);

  useEffect(() => {
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.style.height = "40px";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [messageText]);

  useEffect(() => {
    const chatContainer = document.querySelector(".chat-messages");
    if (!chatContainer) return;
  
    const handleScroll = () => {
      const distanceFromBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;
      setShowScrollButton(distanceFromBottom > 200);
    };
  
    chatContainer.addEventListener("scroll", handleScroll);
    return () => chatContainer.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      }
    }
  }, [messages, isOpen]);

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (messageText.trim()) {
      const newMessage = {
        userId,
        text: messageText,
        timestamp: new Date(),
        messageId: `${Date.now()}-${userId}`,
        isEdited: false,
      };
  
      const projectRef = doc(firestore, "projects", projectId);
  
      await updateDoc(projectRef, {
        messages: arrayUnion(newMessage),
      });
  
      setMessageText("");
      scrollToBottom();
  
      // Reset textarea height
      const textarea = document.querySelector("textarea");
      if (textarea) {
        textarea.style.height = "40px";
      }
    }
  };  

  // Edit message
  const editMessage = async (messageId: string, newText: string) => {
    const projectRef = doc(firestore, "projects", projectId);
    const projectSnapshot = await getDoc(projectRef);
    const projectData = projectSnapshot.data();
    const updatedMessages = projectData?.messages.map((message: Message) =>
      message.messageId === messageId
        ? { ...message, text: newText, timestamp: new Date(), isEdited: true }
        : message
    );
  
    if (updatedMessages) {
      await updateDoc(projectRef, { messages: updatedMessages });
    }
  
    setEditingMessageId(null);
    setMessageText("");
  
    // Reset textarea height
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.style.height = "40px";
    }
  };

  const deleteMessage = async (messageId: string) => {
    const projectRef = doc(firestore, "projects", projectId);
    const projectSnapshot = await getDoc(projectRef);
    const projectData = projectSnapshot.data();
  
    if (projectData?.messages) {
      const updatedMessages = projectData.messages.map((message: Message) =>
        message.messageId === messageId
          ? { ...message, text: "This message was deleted.", isDeleted: true }
          : message
      );
  
      await updateDoc(projectRef, { messages: updatedMessages });
    }
  };  

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Format timestamp for displaying the time in a human-readable format
  const formatTimestamp = (timestamp: any) => {
    return timestamp && timestamp.seconds
      ? formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true })
      : "Invalid date";
  };

  const formatMessageText = (text: string) => {
    return text
      .replace(/\n/g, "<br>")
      .replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline">$1</a>'
      );
  };  

  return (
    <div
      className={`fixed top-12 right-0 w-96 bg-[#383838] border-l-2 border-white p-4 rounded-l-lg shadow-lg z-30 flex flex-col ${isOpen ? "block" : "hidden"}`}
      style={{ height: 'calc(100vh - 3rem)' }}
    >
      <div className="px-4 pt-4 pb-2 flex justify-between items-center text-white">
        <h2 className="text-lg text-yellow-500 font-bold">Project Chat</h2>
        <button onClick={() => setIsOpen(false)} className="text-white hover:text-yellow-500">
          <FaTimes className="text-2xl" />
        </button>
      </div>
  
      <div className="flex-1 overflow-y-auto px-2 pb-2 pt-4 rounded-md chat-messages">
        <div className="space-y-2">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.userId === userId ? "justify-end ml-12" : "justify-start mr-12"} mb-2`}>
              {/* Display Profile Image */}
              <div className="w-8 h-8 rounded-full overflow-hidden mr-2 mt-2">
                <img
                  src={userNames.get(message.userId)?.profilePhoto || '/placeholder.jpg'}
                  alt="Profile"
                  className="object-cover w-full h-full"
                />
              </div>

              <div
                className={`p-3 rounded-lg max-w-xs relative ${message.userId === userId ? "bg-yellow-500 text-white" : "bg-gray-700 text-white"}`}
              >
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 mr-3">
                    {/* Display username */}
                    <span className="font-semibold text-sm">{userNames.get(message.userId)?.username || "Unknown User"}</span>
            
                    {/* Display edited text */}
                    {message.isEdited && (
                      <span className={`text-[0.6rem] mt-1 ${message.userId === userId ? "text-gray-500" : "text-gray-300"}`}>Edited</span>
                    )}
                  </div>
          
                  <div className="flex items-center">
                    {/* Edit button */}
                    {message.userId === userId && !editingMessageId && !message.isDeleted && (
                      <button
                        onClick={() => {
                          setEditingMessageId(message.messageId);
                          setMessageText(message.text);
                        }}
                        className="text-white text-xs hover:text-gray-500"
                      >
                        <FaEdit />
                      </button>
                    )}
                    
                    {/* Delete Button */}
                    {message.userId === userId && !editingMessageId && !message.isDeleted && (
                      <button
                        onClick={() => deleteMessage(message.messageId)}
                        className="text-white text-xs hover:text-red-500 ml-2"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </div>
            
                {/* Message text */}
                <p className="text-xs">
                  {message.isDeleted ? (
                    <span className="italic text-white">This message was deleted.</span>
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: formatMessageText(message.text) }} />
                  )}
                </p>
            
                {/* Timestamp */}
                <p className={`text-[0.6rem] ${message.userId === userId ? "text-gray-500" : "text-gray-300"} mt-1`}>
                  {formatTimestamp(message.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (editingMessageId) {
              editMessage(editingMessageId, messageText);
            } else {
              sendMessage(e);
            }
          }}
          className="flex gap-2 items-end"
        >
          {/* Textarea & Editing Notice Wrapper */}
          <div className="flex flex-col flex-auto relative">
            {showScrollButton && (
              <div className={`absolute right-4 ${editingMessageId ? "bottom-[100px]" : "bottom-[65px]"} bg-yellow-500 p-2 rounded-full text-white shadow-md`}>
                <button onClick={scrollToBottom} className="flex items-center gap-2 text-sm">
                  <BiChevronsDown /> Scroll to Bottom
                </button>
              </div>
            )}

            {/* Editing Message Notice - Positioned Above the Textarea */}
            {editingMessageId && (
              <div className="bg-[#484848] text-white p-2 rounded-t-md flex items-center justify-between">
                <span className="text-sm text-gray-300">Editing Message</span>
                <button
                  onClick={() => {
                    setEditingMessageId(null);
                    setMessageText("");
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <FaTimes />
                </button>
              </div>
            )}
  
            {/* Textarea */}
            <textarea
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                e.target.style.height = "40px"; // Reset height
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; // Auto-grow
              }}
              className="p-2 bg-[#2c2c2c] outline-none focus:outline-yellow-500 text-white rounded-b-lg resize-none overflow-y-auto"
              placeholder="Type your message..."
              rows={1}
              style={{ height: "40px", minHeight: "40px", maxHeight: "120px" }}
            />
          </div>
  
          {/* Send Button */}
          <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 p-2 mb-2 rounded-lg h-[30px]">
            <FaPaperPlane />
          </button>
        </form>
      </div>
    </div>
  );
};

export const ChatPopupButton = ({ projectId, userId }: ChatProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 bg-yellow-500 p-4 rounded-full text-white hover:bg-yellow-600 transition-all"
      >
        <FaCommentAlt className="text-2xl" />
      </button>
      <Chat projectId={projectId} userId={userId} isOpen={isOpen} setIsOpen={setIsOpen} />
    </div>
  );
};

export default Chat;
