// app/admin/disableUser/route.ts (Disable User Server Side API Route Call)
import { NextResponse } from 'next/server';
import { adminAuth } from '../../../../lib/admin'; // Import the adminAuth instance

export async function POST(req: Request) {
  try {
    const { uid, isDisabled } = await req.json(); // Get user ID and current disabled status

    const user = await adminAuth.getUser(uid);
    if (!user) {
      throw new Error(`User with UID ${uid} not found.`);
    }

    await adminAuth.updateUser(uid, { disabled: isDisabled });

    return NextResponse.json(
      { message: `User has been ${isDisabled ? 'disabled' : 'enabled'} successfully` },
      { status: 200 }
    );
  } catch (error: unknown) {
    const typedError = error as Error;
    console.error('Error updating user status: ', typedError.message);

    return NextResponse.json(
      { message: 'Failed to update user', error: typedError.message },
      { status: 500 }
    );
  }
}
