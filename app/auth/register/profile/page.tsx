import { ERROR_MESSAGES, UI_CONSTANTS } from "@/utils/constants";
import Link from "next/link";
import { Suspense } from "react";

import RegisterProfileClient from "./RegisterProfileClient";

export default function RegisterProfilePage() {
  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className='max-w-md w-full'>
        <div className='bg-white rounded-xl border border-gray-200 p-8 mb-4'>
          <Suspense
            fallback={
              <div className='text-center py-8'>
                <p className='text-gray-600'>{ERROR_MESSAGES.LOADING}</p>
              </div>
            }
          >
            <RegisterProfileClient />
          </Suspense>
        </div>

        <div className='text-center'>
          <Link
            className='text-gray-600 text-sm hover:text-gray-900 underline-offset-4 hover:underline'
            href='/auth/login'
          >
            {UI_CONSTANTS.LOGIN_LINK}
          </Link>
        </div>
      </div>
    </div>
  );
}
