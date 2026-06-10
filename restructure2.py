import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add cpuInfo state
state_insertion = r"  const [gpuInfo, setGpuInfo] = useState<GpuInfo | null>(null);\n  const [cpuInfo, setCpuInfo] = useState<string>('Detecting...');"
content = re.sub(r"  const \[gpuInfo, setGpuInfo\] = useState<GpuInfo \| null>\(null\);", state_insertion, content)

# 2. Add invoke get_cpu_info in useEffect
effect_insertion = r"        const gpu = await invoke<GpuInfo>('get_gpu_info');\n        setGpuInfo(gpu);\n        const cpu = await invoke<string>('get_cpu_info');\n        setCpuInfo(cpu);"
content = re.sub(r"        const gpu = await invoke<GpuInfo>\('get_gpu_info'\);\n        setGpuInfo\(gpu\);", effect_insertion, content)

# 3. Add CPU card in header
gpu_card_regex = re.compile(r'(<div className="rounded-2xl border border-zinc-200/70 bg-zinc-50 p-4">\s*<p className="section-caption">\{t\(lang, \'summaryGpu\'\)\}</p>\s*<p className="mt-2 break-words text-sm font-medium text-zinc-950">\{gpuNames\}</p>\s*</div>)', re.DOTALL)
gpu_card = gpu_card_regex.search(content).group(1)
cpu_card = """
                <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50 p-4">
                  <p className="section-caption">CPU</p>
                  <p className="mt-2 break-words text-sm font-medium text-zinc-950">{cpuInfo}</p>
                </div>"""
content = content.replace(gpu_card, gpu_card + cpu_card)

# 4. Change main grid to 2 cols
content = content.replace('className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3"', 'className="grid items-start gap-6 lg:grid-cols-2"')

# 5. Rearrange cards in the main grid
# The current grid has 3 columns.
# Column 1: Game Folder, Nvidia
# Column 2: Stretch
# Column 3: System

# Let's extract the cards
game_folder_regex = re.compile(r'(<motion\.div \{\.\.\.fadeIn\} transition=\{\{ delay: 0\.08, duration: 0\.24 \}\}>\s*<SectionCard title=\{t\(lang, \'gameFolderTitle\'\)\}.*?</SectionCard>\s*</motion\.div>)', re.DOTALL)
stretch_regex = re.compile(r'(<motion\.div \{\.\.\.fadeIn\} transition=\{\{ delay: 0\.12, duration: 0\.24 \}\}>\s*<SectionCard title=\{t\(lang, \'stretchTitle\'\)\}.*?</SectionCard>\s*</motion\.div>)', re.DOTALL)
system_regex = re.compile(r'(<motion\.div \{\.\.\.fadeIn\} transition=\{\{ delay: 0\.16, duration: 0\.24 \}\}>\s*<SectionCard title=\{t\(lang, \'systemTitle\'\)\}.*?</SectionCard>\s*</motion\.div>)', re.DOTALL)
nvidia_regex = re.compile(r'(<motion\.div \{\.\.\.fadeIn\} transition=\{\{ delay: 0\.16, duration: 0\.24 \}\}>\s*<SectionCard title=\{t\(lang, \'nvidiaTitle\'\)\}.*?</SectionCard>\s*</motion\.div>)', re.DOTALL)

game_folder = game_folder_regex.search(content).group(1)
stretch = stretch_regex.search(content).group(1)
system = system_regex.search(content).group(1)
nvidia = nvidia_regex.search(content).group(1)

# Rebuild the grid
grid_start = content.find('<div className="grid items-start gap-6 lg:grid-cols-2">')
grid_end = content.find('          </div>\n          </div>\n      <div className="app-footer">')

new_grid = f"""<div className="grid items-start gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
{game_folder}
{stretch}
            </div>
            <div className="flex flex-col gap-6">
{system}
{nvidia}
            </div>
"""

content = content[:grid_start] + new_grid + content[grid_end:]

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated App.tsx successfully.")
