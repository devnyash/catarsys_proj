import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Pause,
  Play,
  X,
  CheckCircle,
  ArrowUp,
  FolderOpen,
} from 'lucide-react';
import { useDownloadStore } from '@/store/downloadStore';

export default function DynamicIsland() {
  const { tasks, isExpanded, toggleExpanded, pauseTask, resumeTask, cancelTask } =
    useDownloadStore();

  const [hasUpdate] = useState(true);
  const [updateVersion] = useState('1.3.1');

  const downloadingTasks = tasks.filter((t) => t.status === 'downloading');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const totalTasks = tasks.length;

  if (totalTasks === 0 && !hasUpdate) return null;

  const totalProgress =
    tasks.length > 0
      ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)
      : 0;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center">
      <AnimatePresence>
        {/* Update Notification */}
        {hasUpdate && !isExpanded && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="mb-2"
          >
            <div className="flex items-center gap-3 px-4 py-2 bg-foreground/10 backdrop-blur-xl border border-foreground/[0.08] rounded-full shadow-xl shadow-black/30">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <ArrowUp className="w-4 h-4 text-zinc-400" />
              </motion.div>
              <span className="text-xs text-zinc-300">
                Catarsys {updateVersion} доступно
              </span>
              <button className="px-3 py-1 bg-zinc-500/20 text-zinc-400 text-[10px] font-medium rounded-full hover:bg-zinc-500/30 transition-colors">
                Установить
              </button>
            </div>
          </motion.div>
        )}

        {/* Compact State */}
        {!isExpanded && totalTasks > 0 && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            onClick={toggleExpanded}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-3 px-4 py-2 bg-foreground/10 backdrop-blur-xl border border-foreground/[0.08] rounded-full shadow-xl shadow-black/30 hover:bg-foreground/15 transition-colors">
              <Download className="w-4 h-4 text-zinc-400" />
              <span className="text-xs text-zinc-300">
                {downloadingTasks.length > 0
                  ? downloadingTasks[0].modTitle
                  : completedTasks.length > 0
                    ? `${completedTasks.length} завершено`
                    : 'Загрузки'}
              </span>

              {/* Circular Progress */}
              <div className="relative w-6 h-6">
                <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="2"
                  />
                  <motion.circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="text-zinc-400"
                    strokeDasharray={`${2 * Math.PI * 10}`}
                    strokeDashoffset={`${2 * Math.PI * 10 * (1 - totalProgress / 100)}`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-foreground">
                  {totalProgress}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Expanded State */}
        {isExpanded && (
          <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-[400px] max-w-[90vw]"
          >
            <div className="bg-foreground/10 backdrop-blur-xl border border-foreground/[0.08] rounded-2xl shadow-xl shadow-black/30 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/[0.06]">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-semibold text-foreground">
                    Загрузки
                  </span>
                  <span className="text-xs text-zinc-500">
                    ({tasks.length})
                  </span>
                </div>
                <button
                  onClick={toggleExpanded}
                  className="p-1 text-zinc-500 hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Task List */}
              <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="px-4 py-3 border-b border-foreground/[0.04] last:border-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                        {task.modTitle}
                      </span>
                      <div className="flex items-center gap-1">
                        {task.status === 'downloading' && (
                          <>
                            <button
                              onClick={() => pauseTask(task.id)}
                              className="p-1 text-zinc-400 hover:text-foreground transition-colors"
                            >
                              <Pause className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => cancelTask(task.id)}
                              className="p-1 text-zinc-400 hover:text-zinc-400 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        {task.status === 'paused' && (
                          <>
                            <button
                              onClick={() => resumeTask(task.id)}
                              className="p-1 text-zinc-400 hover:text-zinc-400 transition-colors"
                            >
                              <Play className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => cancelTask(task.id)}
                              className="p-1 text-zinc-400 hover:text-zinc-400 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        {task.status === 'completed' && (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-zinc-400" />
                            <button
                              onClick={() => cancelTask(task.id)}
                              className="p-1 text-zinc-400 hover:text-zinc-400 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-foreground/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            task.status === 'completed'
                              ? 'bg-zinc-500'
                              : task.status === 'paused'
                                ? 'bg-zinc-500'
                                : 'bg-zinc-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500 w-8 text-right">
                        {task.progress}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-zinc-500">
                        {task.downloadedSize} / {task.totalSize}
                      </span>
                      {task.status === 'downloading' && (
                        <span className="text-[9px] text-zinc-400">
                          {task.speed}
                        </span>
                      )}
                      {task.status === 'paused' && (
                        <span className="text-[9px] text-zinc-400">Пауза</span>
                      )}
                      {task.status === 'completed' && (
                        <span className="text-[9px] text-zinc-400">
                          Завершено
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              {completedTasks.length > 0 && (
                <div className="px-4 py-2 border-t border-foreground/[0.06] bg-foreground/[0.02]">
                  <button className="flex items-center gap-2 text-[10px] text-zinc-400 hover:text-foreground transition-colors">
                    <FolderOpen className="w-3 h-3" />
                    Открыть папку загрузок
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
