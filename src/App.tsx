/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';

// Mock data for the WhatsApp groups
const MOCK_GROUPS = [
  {
    id: 1,
    title: 'BJE ~ Clan',
    description: 'Group in "𝗧𝗛Ξ 𝗢𝗖𝗧Λ𝗚𝗥Λ𝗠"',
    imageUrl: 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=800&auto=format&fit=crop',
    time: '4:11 pm',
    joinLink: '#',
  },
  {
    id: 2,
    title: 'Anime Enthusiasts',
    description: 'Group in "𝗧𝗛Ξ 𝗢𝗖𝗧Λ𝗚𝗥Λ𝗠"',
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
    time: '2:30 pm',
    joinLink: '#',
  },
  {
    id: 3,
    title: 'Gaming Squad',
    description: 'Group in "𝗧𝗛Ξ 𝗢𝗖𝗧Λ𝗚𝗥Λ𝗠"',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
    time: '11:45 am',
    joinLink: '#',
  },
  {
    id: 4,
    title: 'Movie Nights',
    description: 'Group in "𝗧𝗛Ξ 𝗢𝗖𝗧Λ𝗚𝗥Λ𝗠"',
    imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=800&auto=format&fit=crop',
    time: 'Yesterday',
    joinLink: '#',
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {MOCK_GROUPS.map((group) => (
            <div 
              key={group.id} 
              className="bg-[#202c33] rounded-2xl overflow-hidden flex flex-col shadow-lg border border-[#202c33] hover:border-[#38464e] transition-colors"
            >
              {/* Cover Image */}
              <div className="relative h-48 w-full">
                <img 
                  src={group.imageUrl} 
                  alt={group.title} 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>

              {/* Card Content */}
              <div className="flex flex-col flex-grow">
                <div className="p-4 pb-2">
                  <h3 className="text-[17px] leading-snug font-medium text-[#e9edef] mb-1">
                    {group.title}
                  </h3>
                  <p className="text-[14px] leading-snug text-[#8696a0] mb-2">
                    {group.description}
                  </p>
                  <div className="text-[12px] text-[#8696a0] text-right">
                    {group.time}
                  </div>
                </div>

                {/* Divider & Action Button */}
                <div className="mt-auto border-t border-[#8696a0]/20">
                  <a
                    href={group.joinLink}
                    className="block w-full py-3.5 text-center text-[#00a884] font-medium text-[15px] hover:bg-[#8696a0]/5 transition-colors active:bg-[#8696a0]/10"
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
