import Link from "next/link";

import { UI_CONSTANTS } from "@/utils/constants";

export default function Home() {
  return (
    <>
      <div className='min-h-screen bg-white flex items-center justify-center'>
        <div className='max-w-md w-full'>
          <h1 className='text-center mb-12 text-5xl font-bold text-gray-900'>
            SonaBase
          </h1>

          <div>
            <div className='bg-gray-50 rounded-lg p-6 border border-gray-200 mb-8'>
              <h2 className='text-xl font-semibold mb-3 text-gray-900'>
                ログイン
              </h2>
              <p className='text-gray-600 mb-4 text-sm'>
                アカウントをお持ちの方はこちら
              </p>
              <Link
                className='w-full inline-block bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-center'
                href='/auth/login'
              >
                {UI_CONSTANTS.LOGIN_LINK}
              </Link>
            </div>

            <div className='bg-gray-50 rounded-lg p-6 border border-gray-200'>
              <h2 className='text-xl font-semibold mb-3 text-gray-900'>
                新規登録
              </h2>
              <p className='text-gray-600 mb-4 text-sm'>
                初めてご利用の方はこちら
              </p>
              <Link
                className='w-full inline-block bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-center'
                href='/auth/register'
              >
                {UI_CONSTANTS.REGISTER_LINK}
              </Link>
            </div>
          </div>
        </div>
      </div>
      <footer className='py-2 sm:py-4 text-center text-black border-t border-gray-300/50 mt-auto'>
        <div className='max-w-6xl mx-auto'>
          <div className='flex flex-col items-center'>
            <div className='flex items-center mb-2 sm:mb-3'>
              <Link
                aria-label='Follow us on X'
                className='group relative p-2 sm:p-3 bg-gray-200/60 backdrop-blur-sm rounded-xl hover:bg-gray-300/80 transition-all duration-300 hover:scale-110 hover:shadow-lg'
                href='https://x.com/rii_3112'
                rel='noopener noreferrer'
                target='_blank'
              >
                <svg
                  className='w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-black transition-colors'
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
                </svg>
              </Link>
            </div>

            <div className='w-full max-w-md'>
              <p className='text-xs sm:text-sm text-gray-600 font-light'>
                &copy; {new Date().getFullYear()} SonaBase. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
