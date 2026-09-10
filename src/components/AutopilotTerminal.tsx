import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X, Cpu, FileSearch, Send, Zap, CheckCircle2 } from 'lucide-react';

interface LogMessage {
  id: string;
  agent: 'System' | 'Coordinator' | 'Legal' | 'Comms';
  message: string;
  type: 'info' | 'action' | 'success' | 'error';
  timestamp: number;
}

interface AutopilotTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  isSimulating?: boolean;
}

const AGENT_COLORS = {
  System: 'text-cadence-muted',
  Coordinator: 'text-blue-400',
  Legal: 'text-amber-400',
  Comms: 'text-purple-400',
};

const AGENT_ICONS = {
  System: <Cpu className="w-4 h-4" />,
  Coordinator: <FileSearch className="w-4 h-4" />,
  Legal: <Zap className="w-4 h-4" />,
  Comms: <Send className="w-4 h-4" />,
};

// Realistic simulation steps for the terminal
const SIMULATION_STEPS = [
  { delay: 500, agent: 'System', type: 'info', message: 'Initializing Cadence Multi-Agent Autopilot...' },
  { delay: 1500, agent: 'Coordinator', type: 'info', message: 'Scanning database for overdue invoices across all clients...' },
  { delay: 3000, agent: 'Coordinator', type: 'action', message: 'Found 3 overdue invoices. Triggering parallel analysis tasks.' },
  { delay: 4500, agent: 'Legal', type: 'info', message: 'Cross-referencing Invoice INV-2026-041 with Omega Logistics MSA...' },
  { delay: 6000, agent: 'Legal', type: 'action', message: 'Identified late fee clause (Section 4.2). Penalty applies after 30 days.' },
  { delay: 7500, agent: 'Legal', type: 'success', message: 'Risk calculated: $4,500 at risk. Escalation recommended.' },
  { delay: 9000, agent: 'Comms', type: 'info', message: 'Drafting firm but polite follow-up based on legal findings...' },
  { delay: 10500, agent: 'Comms', type: 'success', message: 'Email draft generated and saved to CRM.' },
  { delay: 11000, agent: 'System', type: 'action', message: 'Dispatching high-risk notification to Slack #finance channel...' },
  { delay: 12000, agent: 'System', type: 'success', message: 'Autopilot scan complete. Systems standing by.' },
];

export function AutopilotTerminal({ isOpen, onClose, isSimulating = false }: AutopilotTerminalProps) {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && isSimulating) {
      setLogs([]);
      let isCancelled = false;

      const runSimulation = async () => {
        for (const step of SIMULATION_STEPS) {
          if (isCancelled) break;
          await new Promise(resolve => setTimeout(resolve, step.delay - (logs.length > 0 ? SIMULATION_STEPS[logs.length - 1]?.delay || 0 : 0)));
          if (isCancelled) break;
          
          setLogs(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            agent: step.agent as any,
            message: step.message,
            type: step.type as any,
            timestamp: Date.now()
          }]);
        }
      };

      runSimulation();
      return () => { isCancelled = true; };
    }
  }, [isOpen, isSimulating]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 md:bottom-6 md:left-auto md:right-6 md:w-[500px] h-[350px] bg-[#0A0A0A] border border-cadence-border rounded-t-xl md:rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono text-xs sm:text-sm"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#111111] border-b border-cadence-border/50">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cadence-muted" />
              <span className="text-cadence-secondary font-semibold tracking-wider uppercase text-[10px] sm:text-xs">Live Agent Brain</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-[#0F9D58]">
                <span className="w-2 h-2 rounded-full bg-[#0F9D58] animate-pulse" />
                Online
              </span>
              <button onClick={onClose} className="text-cadence-muted hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Logs Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3"
              >
                <div className={`mt-0.5 shrink-0 ${AGENT_COLORS[log.agent]}`}>
                  <img 
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${log.agent}&backgroundColor=transparent`} 
                    alt={log.agent}
                    className="w-8 h-8 rounded-full border border-cadence-border/50 bg-cadence-surface/50"
                  />
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold uppercase tracking-wider ${AGENT_COLORS[log.agent]}`}>
                      {log.agent}
                    </span>
                    <span className="text-[10px] text-cadence-muted font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <span className={`
                    ${log.type === 'error' ? 'text-red-400' : ''}
                    ${log.type === 'success' ? 'text-[#0F9D58]' : ''}
                    ${log.type === 'action' ? 'text-white' : ''}
                    ${log.type === 'info' ? 'text-cadence-muted' : ''}
                  `}>
                    {log.message}
                  </span>
                </div>
              </motion.div>
            ))}
            
            {logs.length > 0 && logs.length < SIMULATION_STEPS.length && (
              <div className="flex items-center gap-2 text-cadence-muted mt-4">
                <span className="animate-pulse">_</span>
                <span>Processing...</span>
              </div>
            )}
            
            {logs.length === SIMULATION_STEPS.length && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="mt-6 flex items-center justify-center gap-2 text-[#0F9D58] bg-[#0F9D58]/10 py-2 rounded border border-[#0F9D58]/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Sequence Completed Successfully</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
