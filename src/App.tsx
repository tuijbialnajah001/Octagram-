/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';

const GROUPS = [
  {
    id: '1',
    title: '𝕽𝖊𝖆𝖑𝖒 𝕺𝖋 𝕯𝖊𝖑𝖚𝖘𝖎𝖔𝖓𝖘',
    imageUrl: '/realm.jpg', // You will need to upload the image to the public folder
    joinLink: 'https://chat.whatsapp.com/Kkmoqk2D2iM1HVC2bnqt6v',
  }
];

export default function App() {
  return (
    <div className="min-h-screen bg-[#111b21] text-white py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-4">
            𝗧𝗛Ξ 𝗢𝗖𝗧Λ𝗚𝗥Λ𝗠
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          {GROUPS.map((group) => (
            <div 
              key={group.id} 
              className="bg-[#202c33] rounded-2xl overflow-hidden flex flex-col shadow-lg border border-[#202c33] hover:border-[#38464e] transition-colors"
            >
              {/* Cover Image */}
              <div className="relative h-28 sm:h-48 w-full">
                <img 
                  src={group.imageUrl} 
                  alt={group.title} 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>

              {/* Card Content */}
              <div className="flex flex-col flex-grow">
                <div className="p-3 sm:p-4 pb-2 text-center">
                  <h3 className="text-[14px] sm:text-[17px] leading-snug font-medium text-[#e9edef] mb-1 truncate">
                    {group.title}
                  </h3>
                </div>

                {/* Divider & Action Button */}
                <div className="mt-auto border-t border-[#8696a0]/20">
                  <a
                    href={group.joinLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 sm:py-3.5 text-center text-[#00a884] font-medium text-[13px] sm:text-[15px] hover:bg-[#8696a0]/5 transition-colors active:bg-[#8696a0]/10"
                  >
                    Join group
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-lg text-[#8696a0] max-w-3xl mx-auto font-medium">
            We are not merely a gathering of enthusiasts. We are an alliance — a brotherhood and sisterhood united under the banner of anime.
          </p>
        </div>
      </div>
    </div>
  );
}
