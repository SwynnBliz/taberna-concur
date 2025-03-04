// app/notifications-reply/route.ts (Notify User Reply, Server Side API Route Call)
import { firestore } from "../../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { postId, reply, replyUserId, replyUsername, commentCreatorId, repliedToUserId } = body;

    console.log("Received reply notification data:", body);

    const notifications = [];

    const isCommentCreatorMentioned = repliedToUserId === commentCreatorId;

    if (commentCreatorId && commentCreatorId !== replyUserId) {
      if (!isCommentCreatorMentioned) {
        notifications.push({
          userId: commentCreatorId,
          type: "reply",
          content: `${replyUsername} replied: "${reply}" to your comment`,
          link: `/forum/${postId}`,
          read: false,
          timestamp: serverTimestamp(),
        });
      }
    }
    
    if (repliedToUserId && repliedToUserId !== replyUserId) {
      notifications.push({
        userId: repliedToUserId,
        type: "reply",
        content: `${replyUsername} mentioned you in a reply: "${reply}"`,
        link: `/forum/${postId}`,
        read: false,
        timestamp: serverTimestamp(),
      });
    }

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
