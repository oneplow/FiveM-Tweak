import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract sections
game_folder_regex = re.compile(r'(<motion\.div \{\.\.\.fadeIn\} transition=\{\{ delay: 0\.08, duration: 0\.24 \}\}>\s*<SectionCard title=\{t\(lang, \'gameFolderTitle\'\)\}.*?</SectionCard>\s*</motion\.div>)', re.DOTALL)
stretch_regex = re.compile(r'(<motion\.div \{\.\.\.fadeIn\} transition=\{\{ delay: 0\.12, duration: 0\.24 \}\}>\s*<SectionCard title=\{t\(lang, \'stretchTitle\'\)\}.*?</SectionCard>\s*</motion\.div>)', re.DOTALL)
system_regex = re.compile(r'(<motion\.div \{\.\.\.fadeIn\} transition=\{\{ delay: 0\.16, duration: 0\.24 \}\}>\s*<SectionCard title=\{t\(lang, \'systemTitle\'\)\}.*?</SectionCard>\s*</motion\.div>)', re.DOTALL)
nvidia_regex = re.compile(r'(<motion\.div \{\.\.\.fadeIn\} transition=\{\{ delay: 0\.16, duration: 0\.24 \}\}>\s*<SectionCard title=\{t\(lang, \'nvidiaTitle\'\)\}.*?</SectionCard>\s*</motion\.div>)', re.DOTALL)
launch_regex = re.compile(r'(<motion\.div \{\.\.\.fadeIn\} transition=\{\{ delay: 0\.08, duration: 0\.24 \}\}>\s*<SectionCard title=\{t\(lang, \'launchTitle\'\)\}.*?</SectionCard>\s*</motion\.div>)', re.DOTALL)
log_regex = re.compile(r'(<motion\.div \{\.\.\.fadeIn\} transition=\{\{ delay: 0\.12, duration: 0\.24 \}\}>\s*<SectionCard title=\{t\(lang, \'logTitle\'\)\}.*?</SectionCard>\s*</motion\.div>)', re.DOTALL)

game_folder = game_folder_regex.search(content).group(1)
stretch = stretch_regex.search(content).group(1)
system = system_regex.search(content).group(1)
nvidia = nvidia_regex.search(content).group(1)

# Extract log and launch inner parts for footer
log_inner_regex = re.compile(r'<div ref=\{logRef\}.*?</div>', re.DOTALL)
log_inner = log_inner_regex.search(content).group(0)

badges_regex = re.compile(r'(<div className="flex flex-wrap gap-2">.*?</div>)', re.DOTALL)
badges = badges_regex.search(content).group(1)

# we will rebuild the grid
grid_start = content.find('<div className="grid items-start gap-4 lg:grid-cols-2">')
grid_end = content.find('          {/* Removed Advanced Mode section */}')

new_grid = f"""<div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-6">
{game_folder}
{nvidia}
            </div>
            <div className="flex flex-col gap-6">
{stretch}
            </div>
            <div className="flex flex-col gap-6">
{system}
            </div>
          </div>
"""

new_footer = f"""
      <div className="app-footer">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6">
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

# find the end of app-scroll to insert footer
end_scroll = after_grid.find('      <AnimatePresence>')
before_end_scroll = after_grid[:end_scroll]
after_end_scroll = after_grid[end_scroll:]

# Wait, the closing tags before AnimatePresence are:
#         </div>
#       </div>
# Let's insert footer right after `</div>` of app-scroll
insert_pos = before_end_scroll.rfind('</div>', 0, before_end_scroll.rfind('</div>') - 1)

modified_after_grid = before_end_scroll[:insert_pos] + "</div>" + new_footer + before_end_scroll[insert_pos+6:]

final_content = before_grid + new_grid + "\n          " + modified_after_grid + after_end_scroll

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(final_content)
print("Updated App.tsx")
