import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove handleBrowseFolder
content = re.sub(r'  const handleBrowseFolder = async \(\) => \{.*?\n  \};\n', '', content, flags=re.DOTALL)

# 2. Add cpuInfo state
state_insertion = r"  const [gpuInfo, setGpuInfo] = useState<GpuInfo | null>(null);\n  const [cpuInfo, setCpuInfo] = useState<string>('Detecting...');"
content = re.sub(r"  const \[gpuInfo, setGpuInfo\] = useState<GpuInfo \| null>\(null\);", state_insertion, content)

# 3. Add invoke get_cpu_info in useEffect
effect_insertion = r"        const gpu = await invoke<GpuInfo>('get_gpu_info');\n        setGpuInfo(gpu);\n        const cpu = await invoke<string>('get_cpu_info');\n        setCpuInfo(cpu);"
content = re.sub(r"        const gpu = await invoke<GpuInfo>\('get_gpu_info'\);\n        setGpuInfo\(gpu\);", effect_insertion, content)

# 4. Add CPU card in header
gpu_card_regex = re.compile(r'(<div className="rounded-2xl border border-zinc-200/70 bg-zinc-50 p-4">\s*<p className="section-caption">\{t\(lang, \'summaryGpu\'\)\}</p>\s*<p className="mt-2 break-words text-sm font-medium text-zinc-950">\{gpuNames\}</p>\s*</div>)', re.DOTALL)
gpu_card = gpu_card_regex.search(content).group(1)
cpu_card = """
                <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50 p-4">
                  <p className="section-caption">CPU</p>
                  <p className="mt-2 break-words text-sm font-medium text-zinc-950">{cpuInfo}</p>
                </div>"""
content = content.replace(gpu_card, gpu_card + cpu_card)

# 5. Extract components
game_folder_regex = re.compile(r'(<motion\.div \{\.\.\.fadeIn\} transition=\{\{ delay: 0\.08, duration: 0\.24 \}\}>\s*<SectionCard title=\{t\(lang, \'gameFolderTitle\'\)\}.*?</SectionCard>\s*</motion\.div>)', re.DOTALL)
stretch_regex = re.compile(r'(<motion\.div \{\.\.\.fadeIn\} transition=\{\{ delay: 0\.12, duration: 0\.24 \}\}>\s*<SectionCard title=\{t\(lang, \'stretchTitle\'\)\}.*?</SectionCard>\s*</motion\.div>)', re.DOTALL)
system_regex = re.compile(r'(<motion\.div \{\.\.\.fadeIn\} transition=\{\{ delay: 0\.16, duration: 0\.24 \}\}>\s*<SectionCard title=\{t\(lang, \'systemTitle\'\)\}.*?</SectionCard>\s*</motion\.div>)', re.DOTALL)
nvidia_regex = re.compile(r'(<motion\.div \{\.\.\.fadeIn\} transition=\{\{ delay: 0\.16, duration: 0\.24 \}\}>\s*<SectionCard title=\{t\(lang, \'nvidiaTitle\'\)\}.*?</SectionCard>\s*</motion\.div>)', re.DOTALL)

game_folder = game_folder_regex.search(content).group(1)
stretch = stretch_regex.search(content).group(1)
system = system_regex.search(content).group(1)
nvidia = nvidia_regex.search(content).group(1)

log_inner_regex = re.compile(r'<div ref=\{logRef\}.*?</div>', re.DOTALL)
log_inner = log_inner_regex.search(content).group(0)

badges_regex = re.compile(r'(<div className="flex flex-wrap gap-2">.*?</div>)', re.DOTALL)
badges = badges_regex.search(content).group(1)

# 6. Replace Grid and Footer
grid_start = content.find('<div className="grid items-start gap-4 lg:grid-cols-2">')
grid_end = content.find('          {/* Removed Advanced Mode section */}')

new_grid = f"""<div className="grid items-start gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
{game_folder}
{stretch}
            </div>
            <div className="flex flex-col gap-6">
{system}
{nvidia}
            </div>
          </div>
"""

new_footer = f"""
      <div className="app-footer">
        <div className="mx-auto flex w-full max-w-[1000px] items-center gap-6">
          <div className="flex-1">
            <div className="text-xs font-semibold text-zinc-500 mb-2">{{t(lang, 'logTitle')}}</div>
            {log_inner.replace("h-40", "h-24")}
          </div>
          <div className="flex w-64 shrink-0 flex-col items-end gap-3">
            {badges}
            <button className="primary-button w-full text-lg py-4 shadow-lg shadow-zinc-900/10" disabled={{launching}} onClick={{handleLaunch}}>
              {{launching ? t(lang, 'launching') : t(lang, 'play')}}
            </button>
          </div>
        </div>
      </div>
"""

before_grid = content[:grid_start]
after_grid = content[grid_end:]

end_scroll = after_grid.find('      <AnimatePresence>')
before_end_scroll = after_grid[:end_scroll]
after_end_scroll = after_grid[end_scroll:]

insert_pos = before_end_scroll.rfind('</div>', 0, before_end_scroll.rfind('</div>') - 1)
modified_after_grid = before_end_scroll[:insert_pos] + "</div>" + new_footer + before_end_scroll[insert_pos+6:]

final_content = before_grid + new_grid + "\n          " + modified_after_grid + after_end_scroll

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(final_content)
print("Fix applied successfully.")
