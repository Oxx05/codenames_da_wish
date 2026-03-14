import React, { useState } from 'react';
import { BookOpen, MonitorPlay, ArrowRight, ArrowLeft, CheckCircle2, ShieldAlert, X, Eye, Clock, History, RotateCcw, Target, Users, Swords, Gamepad2 } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper to merge tailwind classes safely
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface ManualPageProps {
  onClose: () => void;
}

type Tab = 'tutorial' | 'rules' | 'controls';

export default function ManualPage({ onClose }: ManualPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('tutorial');
  const [tutorialStep, setTutorialStep] = useState(0);

  const tutorialSteps = [
    {
      title: "Welcome to Operations",
      text: "In this game, two to four teams compete to locate all of their secret agents. You can play in Offline mode (passing a single device) or Online mode.",
      action: "Next",
      visual: (
        <div className="flex gap-6 justify-center w-full max-w-sm mx-auto">
          <div className="flex-1 bg-gradient-to-br from-red-600 to-red-900 border border-red-400 p-4 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.5)] flex flex-col items-center justify-center transform -rotate-2 hover:rotate-0 transition-transform duration-300">
            <span className="text-white font-black tracking-widest text-lg uppercase drop-shadow-md">Red</span>
            <span className="text-red-200 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Team</span>
          </div>
          <div className="flex-1 bg-gradient-to-br from-blue-600 to-blue-900 border border-blue-400 p-4 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.5)] flex flex-col items-center justify-center transform rotate-2 hover:rotate-0 transition-transform duration-300">
            <span className="text-white font-black tracking-widest text-lg uppercase drop-shadow-md">Blue</span>
            <span className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Team</span>
          </div>
        </div>
      )
    },
    {
      title: "The Spymaster's Role",
      text: "One player on each team is the Spymaster. Only Spymasters can see the secret map showing which cards belong to which team.",
      action: "Next",
      visual: (
        <div className="relative w-full max-w-[200px] mx-auto aspect-square bg-slate-800 rounded-xl border-2 border-slate-700/80 p-3 shadow-2xl flex flex-col items-center justify-center group cursor-default hover:border-slate-600 transition-colors">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 px-3 py-1 rounded-full border border-slate-700 text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 shadow-lg whitespace-nowrap"><Eye className="w-3 h-3 text-emerald-400" /> Spymaster Map</div>
          <div className="w-full h-full grid grid-cols-3 gap-1.5 mt-2">
            {[
              'bg-gradient-to-br from-red-500 to-red-600 border-red-400', 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400', 'bg-gradient-to-br from-slate-400 to-slate-500 border-slate-300', 
              'bg-gradient-to-br from-slate-400 to-slate-500 border-slate-300', 'bg-gradient-to-br from-red-500 to-red-600 border-red-400', 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400',
              'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400', 'bg-gradient-to-br from-slate-700 to-slate-900 border-slate-600', 'bg-gradient-to-br from-slate-400 to-slate-500 border-slate-300'
            ].map((colorClass, i) => (
              <div key={i} className={cn("rounded border shadow-inner overflow-hidden relative flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity", colorClass)}>
                 <div className="absolute inset-0 bg-white/5 mix-blend-overlay"></div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Giving Clues",
      text: "The Spymaster gives a one-word clue that connects to multiple cards on the board, followed by a number indicating how many cards it relates to.",
      action: "Next",
      visual: (
        <div className="relative bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl text-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)] w-full max-w-xs mx-auto overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-3 flex items-center justify-center gap-1"><MonitorPlay className="w-3 h-3"/> Incoming Transmission</div>
          <div className="flex items-center justify-center gap-3">
             <div className="bg-slate-950 border border-slate-700 px-4 py-2 rounded-lg text-lg sm:text-2xl font-black tracking-widest text-white shadow-inner">ANIMAL</div>
             <div className="text-slate-500 font-black text-xl">x</div>
             <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-400 px-4 py-2 rounded-lg text-lg sm:text-2xl font-black shadow-inner">2</div>
          </div>
        </div>
      )
    },
    {
      title: "Operatives Guess",
      text: "The rest of the team are Operatives. They must guess which cards their Spymaster meant by selecting them on the board.",
      action: "Next",
      visual: (
        <div className="flex justify-center items-center gap-4 sm:gap-6 perspective-1000 relative">
          {/* Unrevealed Card */}
          <div className="relative aspect-[4/3] w-28 sm:w-32 bg-slate-800 border-2 border-slate-600 rounded-xl shadow-xl flex items-center justify-center overflow-hidden cursor-default transition-colors">
             <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"></div>
             <span className="font-black text-slate-300 tracking-widest z-10 text-sm sm:text-base">APPLE</span>
          </div>
          {/* Revealed Card */}
          <div className="relative aspect-[4/3] w-28 sm:w-32 bg-gradient-to-br from-red-600 to-red-800 rounded-xl shadow-2xl flex items-center justify-center overflow-hidden border-2 border-red-400 ring-4 ring-red-500/20 scale-105 z-10 transition-transform">
             <div className="absolute top-1 left-1 bottom-1 right-1 border border-white/20 rounded-lg pointer-events-none"></div>
             <span className="font-black text-white/90 tracking-widest z-10 drop-shadow-md text-sm sm:text-base">CAT</span>
             <div className="absolute bottom-2 right-2 opacity-80 drop-shadow-md"><CheckCircle2 className="w-5 h-5 text-red-200" /></div>
          </div>
        </div>
      )
    },
    {
      title: "The Assassin",
      text: "Beware the black card. If operatives guess the Assassin card, their team instantly loses the game (or the game ends for everyone, depending on your settings).",
      action: "Finish Tutorial",
      visual: (
        <div className="flex justify-center">
          <div className="relative aspect-[4/3] w-36 sm:w-40 bg-slate-950 border border-slate-800 rounded-xl flex flex-col items-center justify-center rotate-3 scale-110 shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden group hover:border-rose-500/50 transition-colors duration-500 cursor-default">
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-1 left-1 bottom-1 right-1 border border-rose-500/20 rounded-lg pointer-events-none"></div>
            <ShieldAlert className="text-rose-500 w-8 h-8 sm:w-10 sm:h-10 mb-2 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-transform duration-500 group-hover:scale-110" />
            <span className="font-black text-slate-100 tracking-[0.2em] text-xs sm:text-sm group-hover:text-white transition-colors duration-500">ASSASSIN</span>
          </div>
        </div>
      )
    }
  ];

  const currentStep = tutorialSteps[tutorialStep];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 overflow-y-auto w-full fixed inset-0 z-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between">
        <h1 className="text-xl font-black tracking-widest text-white flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-indigo-400" />
          FIELD MANUAL
        </h1>
        <button 
          onClick={onClose}
          className="p-2 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col">
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 bg-slate-900 rounded-xl mb-8 w-fit mx-auto border border-slate-800">
          <button 
            onClick={() => setActiveTab('tutorial')}
            className={cn(
              "px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2",
              activeTab === 'tutorial' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            <MonitorPlay className="w-4 h-4" />
            Interactive Tutorial
          </button>
          <button 
            onClick={() => setActiveTab('rules')}
            className={cn(
              "px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2",
              activeTab === 'rules' ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            <BookOpen className="w-4 h-4" />
            Full Rules
          </button>
          <button 
            onClick={() => setActiveTab('controls')}
            className={cn(
              "px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2",
              activeTab === 'controls' ? "bg-amber-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            <ShieldAlert className="w-4 h-4" />
            Controls & Interface
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'tutorial' && (
            <div className="max-w-xl mx-auto flex flex-col h-full min-h-[400px]">
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col relative shadow-2xl">
                
                {/* Progress Indicators */}
                <div className="flex gap-2 justify-center mb-8">
                  {tutorialSteps.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        idx === tutorialStep ? "w-8 bg-indigo-500" : 
                        idx < tutorialStep ? "w-4 bg-indigo-500/50" : "w-4 bg-slate-800"
                      )}
                    />
                  ))}
                </div>

                <div className="flex-1 flex flex-col justify-center items-center text-center">
                  <div className="w-full h-48 mb-8 flex items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800/50 shadow-inner">
                    {currentStep.visual}
                  </div>
                  <h2 className="text-2xl font-black text-white mb-4 tracking-wide">{currentStep.title}</h2>
                  <p className="text-slate-400 text-lg leading-relaxed">{currentStep.text}</p>
                </div>

                <div className="flex justify-between mt-8 pt-6 border-t border-slate-800/50">
                  <button 
                    onClick={() => setTutorialStep(prev => Math.max(0, prev - 1))}
                    disabled={tutorialStep === 0}
                    className="px-4 py-2 flex items-center gap-2 font-bold text-slate-400 hover:text-white disabled:opacity-0 transition-all font-sans"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button 
                    onClick={() => {
                      if (tutorialStep < tutorialSteps.length - 1) {
                        setTutorialStep(prev => prev + 1);
                      } else {
                        setActiveTab('rules');
                      }
                    }}
                    className={cn(
                      "px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 font-sans",
                      tutorialStep === tutorialSteps.length - 1 
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50" 
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/50"
                    )}
                  >
                    {currentStep.action} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
              
              <div className="relative bg-slate-900/80 backdrop-blur border border-indigo-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(79,70,229,0.1)] overflow-hidden group">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-700"></div>
                <div className="flex items-start gap-4 sm:gap-6 relative z-10">
                  <div className="bg-indigo-500/20 p-3 sm:p-4 rounded-2xl border border-indigo-500/30 shrink-0">
                    <Target className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-widest text-indigo-400 mb-2 uppercase drop-shadow-sm">1. Target Objective</h3>
                    <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
                      Two teams compete to see who can make contact with all of their agents first. Spymasters give one-word clues that can point to multiple words on the board. Their teammates try to guess words of the right color while avoiding those that belong to the opposing team. And everyone wants to avoid the designated assassin.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative bg-slate-900/80 backdrop-blur border border-amber-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(245,158,11,0.05)] overflow-hidden group">
                <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors duration-700"></div>
                <div className="flex items-start gap-4 sm:gap-6 relative z-10 flex-col sm:flex-row">
                  <div className="bg-amber-500/20 p-3 sm:p-4 rounded-2xl border border-amber-500/30 shrink-0">
                    <Users className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="text-xl sm:text-2xl font-black tracking-widest text-amber-400 mb-6 uppercase drop-shadow-sm">2. Team Roles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/50">
                        <h4 className="font-black text-amber-500 tracking-wider mb-2 flex items-center gap-2">SPYMASTER</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">Knows the secret identities of all cards on the table via the private map. Their job is to give a single-word clue and a number (e.g., "Animal, 2") to secretly guide their team without helping the enemy.</p>
                      </div>
                      <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/50">
                        <h4 className="font-black text-indigo-400 tracking-wider mb-2 flex items-center gap-2">OPERATIVE</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">Only sees the front text of the cards. Must use the Spymaster's given clue to correctly select matching surface words without hitting enemy tiles or the instant-loss Assassin.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative bg-slate-900/80 backdrop-blur border border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(16,185,129,0.05)] overflow-hidden group">
                <div className="flex items-start gap-4 sm:gap-6 relative z-10">
                  <div className="bg-emerald-500/20 p-3 sm:p-4 rounded-2xl border border-emerald-500/30 shrink-0">
                    <Swords className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="w-full">
                    <h3 className="text-xl sm:text-2xl font-black tracking-widest text-emerald-400 mb-6 uppercase drop-shadow-sm">3. Turn Resolution</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="flex gap-4 items-start bg-slate-950/30 p-4 rounded-xl border border-emerald-500/10">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                        <div>
                          <strong className="text-white block mb-1">Correct Identity</strong>
                          <p className="text-slate-400 text-xs sm:text-sm">If you guess a card belonging to your team, you may guess again (up to the limit of Clue Number + 1).</p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-start bg-slate-950/30 p-4 rounded-xl border border-slate-500/10">
                        <div className="w-3 h-3 rounded-full bg-slate-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(148,163,184,0.8)]"></div>
                        <div>
                          <strong className="text-white block mb-1">Neutral Bystander</strong>
                          <p className="text-slate-400 text-xs sm:text-sm">If you guess a neutral card, your turn usually ends immediately. No penalty, but you lose momentum. <span className="text-indigo-300 italic">(Configurable in settings)</span></p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-start bg-slate-950/30 p-4 rounded-xl border border-rose-500/10">
                        <div className="w-3 h-3 rounded-full bg-rose-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                        <div>
                          <strong className="text-white block mb-1">Opponent Agent</strong>
                          <p className="text-slate-400 text-xs sm:text-sm">If you guess an opponent's card, your turn ends strictly immediately. You have permanently helped the enemy team. <span className="text-indigo-300 italic">(Configurable in settings)</span></p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-start bg-slate-950/30 p-4 rounded-xl border border-slate-700">
                        <div className="w-3 h-3 bg-black border border-slate-600 rounded-sm mt-1.5 shrink-0 shadow-[0_0_8px_rgba(0,0,0,1)]"></div>
                        <div>
                          <strong className="text-white block mb-1 tracking-widest uppercase">The Assassin</strong>
                          <p className="text-slate-400 text-xs sm:text-sm">Contacting the assassin results in an instant, unrecoverable loss for your team. Be completely sure.</p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              <div className="relative bg-slate-900/80 backdrop-blur border border-teal-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(20,184,166,0.05)] overflow-hidden group">
                <div className="flex items-start gap-4 sm:gap-6 relative z-10">
                  <div className="bg-teal-500/20 p-3 sm:p-4 rounded-2xl border border-teal-500/30 shrink-0">
                    <Gamepad2 className="w-8 h-8 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-widest text-teal-400 mb-4 uppercase drop-shadow-sm">4. Global Formats</h3>
                    <div className="space-y-4">
                      <div className="pl-4 border-l-2 border-teal-500/30">
                        <h4 className="text-white font-bold mb-1 tracking-wide">Standard Text Mode</h4>
                        <p className="text-slate-400 text-sm">Spymasters type their clues directly into the application securely. The clue is then permanently displayed on screen for the operatives' reference.</p>
                      </div>
                      <div className="pl-4 border-l-2 border-teal-500/30">
                        <h4 className="text-white font-bold mb-1 tracking-wide">Verbal Pass & Play (Offline)</h4>
                        <p className="text-slate-400 text-sm">To speed up gameplay when sharing a physical room with friends, the Spymaster simply says the clue out loud. The app skips the text-entry phase entirely for maximum fluidity.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'controls' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-black tracking-widest text-white mb-6 text-center">INTERFACE GUIDE</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-start gap-4">
                  <div className="bg-slate-800 p-3 rounded-lg shrink-0">
                    <Eye className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">Spymaster Map Toggle</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">Used solely by the Spymaster to securely reference the colored map. Pressing it hides the map to allow passing the device safely to Operatives.</p>
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-start gap-4">
                  <div className="bg-slate-800 p-3 rounded-lg shrink-0">
                    <History className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">Clue History Log</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">Opens a sheet displaying all previous clues given during the match. Useful for Operatives reviewing past information.</p>
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-start gap-4">
                  <div className="bg-slate-800 p-3 rounded-lg shrink-0">
                    <Clock className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">Turn Timer</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">If configured in the lobby, displays the remaining seconds to make a decision. Turns pass automatically when depleted.</p>
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-start gap-4">
                  <div className="bg-slate-800 p-3 rounded-lg shrink-0">
                    <RotateCcw className="w-6 h-6 text-rose-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">Host Controls</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">The host (or device owner offline) has authority to restart the match or adjust settings via the action bar across the top.</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 bg-indigo-900/20 border border-indigo-500/30 p-6 rounded-2xl text-center">
                <h4 className="font-bold text-indigo-300 mb-2 tracking-wide uppercase">Card Marking</h4>
                <p className="text-sm text-indigo-200/70">
                  Operatives can <strong>Long-Press</strong> (or Right-Click) any unrevealed card to toggle a marker flag on it. 
                  This is useful for highlighting potential targets while discussing clues with your team without locking in a final guess.
                </p>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
