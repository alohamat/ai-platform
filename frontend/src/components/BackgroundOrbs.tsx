export function BackgroundOrbs() {
  return (
    <>
      <div className="fixed -top-40 -left-24 w-125 h-125 rounded-full opacity-35 dark:opacity-25 pointer-events-none blur-[90px] bg-[#c4b5fd] dark:bg-[#6d48c9] transition-colors duration-500" />
      <div className="fixed top-20 -right-20 w-100 h-100 rounded-full opacity-30 dark:opacity-20 pointer-events-none blur-[90px] bg-[#a5c8f0] dark:bg-[#1e3a8a] transition-colors duration-500" />
      <div className="fixed -bottom-16 left-1/2 w-75 h-75 rounded-full opacity-20 dark:opacity-15 pointer-events-none blur-[90px] bg-[#bbf7d0] dark:bg-[#3b0764] transition-colors duration-500" />
    </>
  );
}
