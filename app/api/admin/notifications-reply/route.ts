import { firestore } from "../../../firebase/config";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { postId, reply, replyUserId, replyUsername, commentCreatorId, repliedToUserId } = body;

    console.log("Received reply notification data:", body);

    const notifications = [];

    // Check if the comment creator is mentioned in the reply
    const isCommentCreatorMentioned = repliedToUserId === commentCreatorId;

    // Notify the original comment creator (only if the replier isn't the same user)
    if (commentCreatorId && commentCreatorId !== replyUserId) {
      // If the comment creator is not mentioned in the reply
      if (!isCommentCreatorMentioned) {
        notifications.push({
          userId: commentCreatorId,
          type: "reply",
          content: `${replyUsername} replied: "${reply}" to your comment`,
          link: `/post-view/${postId}`,
          read: false,
          timestamp: serverTimestamp(),
        });
      }
    }

    // If the comment creator is mentioned, send a "mention" notification instead
    // Notify the user being replied to (using repliedToUserId)
    if (repliedToUserId && repliedToUserId !== replyUserId) {
      notifications.push({
        userId: repliedToUserId,
        type: "reply",
        content: `${replyUsername} mentioned you in a reply: "${reply}"`,
        link: `/post-view/${postId}`,
        read: false,
        timestamp: serverTimestamp(),
      });
    }

    // Store notifications in Firestore
    if (notifications.length > 0) {
      for (const notification of notifications) {
        await addDoc(collection(firestore, "notifications"), notification);
      }
      console.log("Reply notifications added to Firestore");
    }

    return NextResponse.json({ message: "Reply notifications created" });
  } catch (error) {
    console.error("Error creating reply notification:", error);
    return NextResponse.json({ error: "Failed to create reply notification" }, { status: 500 });
  }
}
