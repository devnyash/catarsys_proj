import { motion } from 'framer-motion';
import {
  Download,
  FolderOpen,
  CheckCircle,
  Pause,
  Play,
  X,
} from 'lucide-react';
import { useDownloadStore } from '@/store/downloadStore';

export default function DownloadsPage() {
  const { tasks, pauseTask, resumeTask, cancelTask } = useDownloadStore();

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-white mb-1">Загрузки</h1>
        <p className="text-sm text-zinc-500">
          Управляйте вашими загруженными модами
        </p>
      </motion.div>

      {/* Download List */}
      <div className="space-y-2">
        {tasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 flex items-center gap-4"
          >
            {/* Icon */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                task.status === 'completed'
                  ? 'bg-emerald-500/10'
                  : task.status === 'downloading'
                    ? 'bg-rose-500/10'
                    : 'bg-amber-500/10'
              }`}
            >
              {task.status === 'completed' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : task.status === 'downloading' ? (
                <Download className="w-5 h-5 text-rose-400 animate-bounce" />
              ) : (
                <Pause className="w-5 h-5 text-amber-400" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-white truncate">
                {task.modTitle}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-zinc-500">
                  {task.downloadedSize} / {task.totalSize}
                </span>
                {task.status === 'downloading' && (
                  <span className="text-[10px] text-emerald-400">
                    {task.speed}
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    task.status === 'completed'
                      ? 'bg-emerald-500'
                      : task.status === 'paused'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${task.progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {task.status === 'downloading' && (
                <>
                  <button
                    onClick={() => pauseTask(task.id)}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => cancelTask(task.id)}
                    className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
              {task.status === 'paused' && (
                <>
                  <button
                    onClick={() => resumeTask(task.id)}
                    className="p-2 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => cancelTask(task.id)}
                    className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
              {task.status === 'completed' && (
                <>
                  <button
                    onClick={() => {}}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Открыть папку"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => cancelTask(task.id)}
                    className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        ))}

        {tasks.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Download className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-zinc-400 mb-1">
              Нет загрузок
            </h3>
            <p className="text-sm text-zinc-600">
              Ваши загруженные моды появятся здесь
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
