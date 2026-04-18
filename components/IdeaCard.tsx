
import React from 'react';
import { Session } from '../types';

interface Props {
  session: Session;
  onClick: (id: string) => void;
}

export const IdeaCard: React.FC<Props> = ({ session, onClick }) => {
  const getIcon = () => {
    switch (session.type) {
      case 'text': return 'fa-pen-to-square';
      case 'voice': return 'fa-microphone';
      case 'photo': return 'fa-camera';
    }
  };

  const statusLabels = {
    'interviewing': '对话中',
    'synthesizing': '合成中',
    'completed': '已结项'
  };

  return (
    <div 
      onClick={() => onClick(session.id)}
      className="group glass-morphism p-6 rounded-3xl cursor-pointer hover:border-indigo-500/50 transition-all border border-slate-800/50 shadow-lg hover:shadow-indigo-500/10"
    >
      <div className="flex justify-between items-start mb-6">
        <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
          {statusLabels[session.status]}
        </span>
        <span className="text-slate-600 text-xs font-mono">{new Date(session.timestamp).toLocaleDateString()}</span>
      </div>
      
      <h3 className="text-xl font-serif font-bold text-slate-100 group-hover:text-white mb-4 line-clamp-2 leading-snug">
        <i className={`fa-solid ${getIcon()} text-slate-500 group-hover:text-indigo-400 mr-2 text-sm`}></i>
        {session.finalArtifact?.title || session.initialSpark}
      </h3>
      
      <p className="text-slate-400 text-sm line-clamp-3 italic leading-relaxed">
        {session.finalArtifact?.summary || (session.status === 'interviewing' ? "正在与缪斯进行思想碰撞..." : "正在打磨最终稿件...")}
      </p>
    </div>
  );
};
