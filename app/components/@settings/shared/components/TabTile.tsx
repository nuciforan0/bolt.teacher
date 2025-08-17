import * as Tooltip from '@radix-ui/react-tooltip';
import { classNames } from '~/utils/classNames';
import type { TabVisibilityConfig } from '~/components/@settings/core/types';
import { TAB_LABELS, TAB_ICONS } from '~/components/@settings/core/constants';
import { GlowingEffect } from '~/components/ui/GlowingEffect';

interface TabTileProps {
  tab: TabVisibilityConfig;
  onClick?: () => void;
  isActive?: boolean;
  hasUpdate?: boolean;
  statusMessage?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const TabTile: React.FC<TabTileProps> = ({
  tab,
  onClick,
  isActive,
  hasUpdate,
  statusMessage,
  description,
  isLoading,
  className,
  children,
}: TabTileProps) => {
  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className={classNames('min-h-[160px] list-none', className || '')}>
            <div className="relative h-full rounded-xl border border-[#E5E5E5] dark:border-[#333333] p-0.5">
              <GlowingEffect
                blur={0}
                borderWidth={1}
                spread={20}
                glow={true}
                disabled={false}
                proximity={40}
                inactiveZone={0.3}
                movementDuration={0.4}
              />
              <div
                onClick={onClick}
                className={classNames(
                  'relative flex flex-col items-center justify-center h-full p-4 rounded-lg',
                  'bg-white dark:bg-[#141414]',
                  'group cursor-pointer',
                  'hover:bg-[#e0fafa] dark:hover:bg-[#129e9d22]',
                  'transition-colors duration-100 ease-out',
                  isActive ? 'bg-[#15b6b405] dark:bg-[#15b6b433]' : '',
                  isLoading ? 'cursor-wait opacity-70 pointer-events-none' : '',
                )}
              >
                {/* Icon */}
                <div
                  className={classNames(
                    'relative',
                    'w-14 h-14',
                    'flex items-center justify-center',
                    'rounded-xl',
                    'bg-gray-100 dark:bg-gray-800',
                    'ring-1 ring-gray-200 dark:ring-gray-700',
                    'group-hover:bg-[#e0fafa] dark:group-hover:bg-[#129e9d22]',
                    'group-hover:ring-[#b3f0f0] dark:group-hover:ring-[#129e9d33]',
                    'transition-all duration-100 ease-out',
                    isActive ? 'bg-[#15b6b405] dark:bg-[#15b6b433] ring-[#15b6b4] dark:ring-[#15b6b4]' : '',
                  )}
                >
                  <div
                    className={classNames(
                      TAB_ICONS[tab.id],
                      'w-8 h-8',
                      'text-gray-600 dark:text-gray-300',
                      'group-hover:text-[#15b6b4] dark:group-hover:text-[#15b6b4cc]',
                      'transition-colors duration-100 ease-out',
                      isActive ? 'text-[#15b6b4] dark:text-[#15b6b4]' : '',
                    )}
                  />
                </div>

                {/* Label and Description */}
                <div className="flex flex-col items-center mt-4 w-full">
                  <h3
                    className={classNames(
                      'text-[15px] font-medium leading-snug mb-2',
                      'text-gray-700 dark:text-gray-200',
                      'group-hover:text-purple-600 dark:group-hover:text-purple-300/90',
                      'transition-colors duration-100 ease-out',
                      isActive ? 'text-purple-500 dark:text-purple-400/90' : '',
                    )}
                  >
                    {TAB_LABELS[tab.id]}
                  </h3>
                  {description && (
                    <p
                      className={classNames(
                        'text-[13px] leading-relaxed',
                        'text-gray-500 dark:text-gray-400',
                        'max-w-[85%]',
                        'text-center',
                        'group-hover:text-purple-500 dark:group-hover:text-purple-400/70',
                        'transition-colors duration-100 ease-out',
                        isActive ? 'text-purple-400 dark:text-purple-400/80' : '',
                      )}
                    >
                      {description}
                    </p>
                  )}
                </div>

                {/* Update Indicator with Tooltip */}
                {hasUpdate && (
                  <>
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse" />
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className={classNames(
                          'px-3 py-1.5 rounded-lg',
                          'bg-[#18181B] text-white',
                          'text-sm font-medium',
                          'select-none',
                          'z-[100]',
                        )}
                        side="top"
                        sideOffset={5}
                      >
                        {statusMessage}
                        <Tooltip.Arrow className="fill-[#18181B]" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </>
                )}

                {/* Children (e.g. Beta Label) */}
                {children}
              </div>
            </div>
          </div>
        </Tooltip.Trigger>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
