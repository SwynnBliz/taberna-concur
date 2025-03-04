// app/notifications/route.ts (Notify User Post/Comment, Server Side API Route Call)
import { firestore } from "../../firebase/config";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { postId, comment, commentUserId } = body;

    console.log("Received data in API:", { postId, comment, commentUserId });

    const postDocRef = doc(firestore, "posts", postId);
    const postDoc = await getDoc(postDocRef);

    if (!postDoc.exists()) {
      console.log("Post not found:", postId);
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const postOwnerId = postDoc.data()?.userId;
    console.log("Post owner ID:", postOwnerId);

    const userDocRef = doc(firestore, "users", commentUserId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.log("User not found:", commentUserId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const username = userDoc.data()?.username || "Anonymous";
    console.log("Commenter username:", username);

    if (postOwnerId) {
      await addDoc(collection(firestore, "notifications"), {
        userId: postOwnerId,
        type: "comment",
        content: `${username} commented: "${comment}" on your post`,
        link: `/forum/${postId}`,
        read: false,
        timestamp: serverTimestamp(),
      });

      console.log("Notification added to Firestore");
    } else {
      console.log("No post owner ID found.");
    }

    return NextResponse.json({ message: "Notification created" });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}
