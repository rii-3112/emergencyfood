import { Button, Card } from "@/components/ui";

interface DisasterDialInfoProps {
  useDisasterDial: boolean;
  onToggleUse: (use: boolean) => void;
}

export function DisasterDialInfo({
  useDisasterDial,
  onToggleUse,
}: DisasterDialInfoProps) {
  return (
    <Card>
      <h2 className='text-xl font-semibold text-gray-900 mb-6'>
        災害用伝言ダイヤル（171）
      </h2>
      <div className='bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm text-gray-700 mb-1'>
              災害発生時に災害用伝言ダイヤル（171）を利用する
            </p>
            <p className='text-xs text-gray-600'>家族での方針を決める</p>
          </div>
          <div className='flex items-center gap-3'>
            <span className='text-sm text-gray-700 font-medium'>
              {useDisasterDial ? "利用" : "不利用"}
            </span>
            <Button
              variant={useDisasterDial ? "primary" : "secondary"}
              size='sm'
              onClick={() => onToggleUse(!useDisasterDial)}
            >
              {useDisasterDial ? "利用しない" : "利用する"}
            </Button>
          </div>
        </div>
      </div>

      <div className='space-y-6'>
        <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
          <h3 className='font-semibold text-gray-900 mb-2'>緊急時の連絡方法</h3>
          <p className='text-gray-700 text-sm'>
            災害発生時は電話がつながりにくくなります。災害用伝言ダイヤル（171）を活用しましょう。
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
            <h3 className='font-semibold text-gray-900 mb-3'>伝言を録音する</h3>
            <ol className='text-sm text-gray-700 space-y-2'>
              <li>
                1. <strong>171</strong> をダイヤル
              </li>
              <li>
                2. <strong>1</strong> を押す（録音）
              </li>
              <li>3. 自宅の電話番号を入力</li>
              <li>4. 30秒以内で伝言を録音</li>
              <li>
                5. <strong>9</strong> を押して終了
              </li>
            </ol>
          </div>

          <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
            <h3 className='font-semibold text-gray-900 mb-3'>伝言を再生する</h3>
            <ol className='text-sm text-gray-700 space-y-2'>
              <li>
                1. <strong>171</strong> をダイヤル
              </li>
              <li>
                2. <strong>2</strong> を押す（再生）
              </li>
              <li>3. 確認したい電話番号を入力</li>
              <li>4. 伝言を聞く</li>
              <li>
                5. <strong>9</strong> を押して終了
              </li>
            </ol>
          </div>
        </div>

        <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
          <h3 className='font-semibold text-gray-900 mb-3'>
            災害用伝言板（web171）
          </h3>
          <p className='text-sm text-gray-700 mb-3'>
            インターネットからも利用できます
          </p>
          <div className='text-sm text-gray-700'>
            <p>
              <strong>URL:</strong> https://www.web171.jp/
            </p>
            <p className='mt-1'>
              スマートフォンやパソコンから安否情報の登録・確認ができます
            </p>
          </div>
        </div>

        <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
          <h3 className='font-semibold text-gray-900 mb-3'>利用可能期間</h3>

          <div className='mb-4'>
            <h4 className='font-medium text-gray-900 mb-2'>災害発生時</h4>
            <ul className='text-sm text-gray-700 space-y-1 ml-2'>
              <li>• 震度6弱以上の地震発生時</li>
              <li>• 噴火などの大規模災害発生時</li>
            </ul>
          </div>

          <div>
            <h4 className='font-medium text-gray-900 mb-2'>体験利用可能日</h4>
            <ul className='text-sm text-gray-700 space-y-1 ml-2'>
              <li>
                • <strong>毎月</strong>：1日・15日
              </li>
              <li>
                • <strong>正月</strong>：1月1日〜3日
              </li>
              <li>
                • <strong>防災週間</strong>：8月30日〜9月5日
              </li>
              <li>
                • <strong>防災とボランティア週間</strong>：1月15日〜21日
              </li>
            </ul>
          </div>
        </div>

        <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
          <h3 className='font-semibold text-gray-900 mb-3'>注意事項</h3>
          <ul className='text-sm text-gray-700 space-y-1'>
            <li>• 伝言の保存期間は48時間です</li>
            <li>• 1つの電話番号につき1〜20件まで録音可能</li>
            <li>• 携帯電話からも利用できます</li>
            <li>• 通話料金はかかりません（無料）</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
