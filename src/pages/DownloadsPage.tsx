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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

export default function DownloadsPage() {
  const { tasks, pauseTask, resumeTask, cancelTask } = useDownloadStore();

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-foreground mb-1">Загрузки</h1>
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
                  ? 'bg-zinc-500/10'
                  : task.status === 'downloading'
                    ? 'bg-zinc-500/10'
                    : 'bg-zinc-500/10'
              }`}
            >
              {task.status === 'completed' ? (
                <CheckCircle className="w-5 h-5 text-zinc-400" />
              ) : task.status === 'downloading' ? (
                <Download className="w-5 h-5 text-zinc-400 animate-bounce" />
              ) : (
                <Pause className="w-5 h-5 text-zinc-400" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground truncate">
                {task.modTitle}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-zinc-500">
                  {task.downloadedSize} / {task.totalSize}
                </span>
                {task.status === 'downloading' && (
                  <span className="text-[10px] text-zinc-400">
                    {task.speed}
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-2 h-1.5 bg-foreground/[0.06] rounded-full overflow-hidden">
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
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {task.status === 'downloading' && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => pauseTask(task.id)}
                        aria-label="Пауза"
                        className="text-zinc-500 hover:text-foreground hover:bg-foreground/5"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Пауза</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => cancelTask(task.id)}
                        aria-label="Отменить"
                        className="text-zinc-500 hover:text-zinc-400 hover:bg-zinc-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Отменить</TooltipContent>
                  </Tooltip>
                </>
              )}
              {task.status === 'paused' && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => resumeTask(task.id)}
                        aria-label="Продолжить"
                        className="text-zinc-500 hover:text-zinc-400 hover:bg-zinc-500/10"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Продолжить</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => cancelTask(task.id)}
                        aria-label="Отменить"
                        className="text-zinc-500 hover:text-zinc-400 hover:bg-zinc-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Отменить</TooltipContent>
                  </Tooltip>
                </>
              )}
              {task.status === 'completed' && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {}}
                        aria-label="Открыть папку"
                        className="text-zinc-500 hover:text-foreground hover:bg-foreground/5"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Открыть папку</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => cancelTask(task.id)}
                        aria-label="Отменить"
                        className="text-zinc-500 hover:text-zinc-400 hover:bg-zinc-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Отменить</TooltipContent>
                  </Tooltip>
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
