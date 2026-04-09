import InviteClient from "./InviteClient";

export default function InvitePage() {
  return (
    <div className='min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gray-50'>
      <div className='max-w-md w-full'>
        <div className='bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8'>
          <InviteClient />
        </div>
      </div>
    </div>
  );
}
