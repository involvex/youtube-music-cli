export type ShellType = 'bash' | 'zsh' | 'powershell' | 'fish';

const COMMANDS = [
	'play',
	'search',
	'playlist',
	'suggestions',
	'radio',
	'pause',
	'resume',
	'skip',
	'back',
	'plugins',
	'import',
	'completions',
];

const PLUGINS_SUBCOMMANDS = [
	'list',
	'install',
	'remove',
	'uninstall',
	'update',
	'enable',
	'disable',
];

const IMPORT_SUBCOMMANDS = ['spotify', 'youtube'];

const COMPLETIONS_SUBCOMMANDS: ShellType[] = [
	'bash',
	'zsh',
	'powershell',
	'fish',
];

const FLAGS = [
	'--theme',
	'--volume',
	'--shuffle',
	'--repeat',
	'--headless',
	'--win32',
	'--web',
	'--web-host',
	'--web-port',
	'--web-only',
	'--web-auth',
	'--name',
	'--help',
	'--version',
];

export function generateCompletion(shell: ShellType): string {
	switch (shell) {
		case 'bash':
			return generateBashCompletion();
		case 'zsh':
			return generateZshCompletion();
		case 'powershell':
			return generatePowerShellCompletion();
		case 'fish':
			return generateFishCompletion();
	}
}

function generateBashCompletion(): string {
	const cmds = COMMANDS.join(' ');
	const pluginsSubs = PLUGINS_SUBCOMMANDS.join(' ');
	const importSubs = IMPORT_SUBCOMMANDS.join(' ');
	const completionsSubs = COMPLETIONS_SUBCOMMANDS.join(' ');
	const flags = FLAGS.join(' ');

	return `# youtube-music-cli bash completion
# Add to ~/.bashrc or ~/.bash_profile:
#   source <(ymc completions bash)
#   # or:
#   ymc completions bash >> ~/.bash_completion

_ymc_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="${cmds}"
    local flags="${flags}"

    case "$prev" in
        plugins)
            COMPREPLY=($(compgen -W "${pluginsSubs}" -- "$cur"))
            return ;;
        import)
            COMPREPLY=($(compgen -W "${importSubs}" -- "$cur"))
            return ;;
        completions)
            COMPREPLY=($(compgen -W "${completionsSubs}" -- "$cur"))
            return ;;
        --theme|-t)
            COMPREPLY=($(compgen -W "dark light midnight matrix" -- "$cur"))
            return ;;
        --repeat|-r)
            COMPREPLY=($(compgen -W "off all one" -- "$cur"))
            return ;;
    esac

    if [[ "$cur" == -* ]]; then
        COMPREPLY=($(compgen -W "$flags" -- "$cur"))
    else
        COMPREPLY=($(compgen -W "$commands" -- "$cur"))
    fi
}

complete -F _ymc_completions ymc youtube-music-cli
`;
}

function generateZshCompletion(): string {
	return `#compdef ymc youtube-music-cli
# youtube-music-cli zsh completion
# Add to your zsh config:
#   source <(ymc completions zsh)
#   # or copy to a directory in $fpath:
#   ymc completions zsh > ~/.zsh/completions/_ymc

_ymc() {
    local -a commands subcommands flags

    commands=(
        'play:Play a track by ID or YouTube URL'
        'search:Search for tracks'
        'playlist:Play a playlist by ID'
        'suggestions:Show music suggestions'
        'pause:Pause playback'
        'resume:Resume playback'
        'skip:Skip to next track'
        'back:Go to previous track'
        'plugins:Manage plugins'
        'import:Import playlists from Spotify or YouTube'
        'completions:Generate shell completion scripts'
    )

    flags=(
        '--theme[Theme to use]:theme:(dark light midnight matrix)'
        '--volume[Initial volume (0-100)]:volume:'
        '--shuffle[Enable shuffle mode]'
        '--repeat[Repeat mode]:mode:(off all one)'
        '--headless[Run without TUI]'
        '--web[Enable web UI server]'
        '--web-host[Web server host]:host:'
        '--web-port[Web server port]:port:'
        '--web-only[Run web server without CLI UI]'
        '--web-auth[Authentication token for web server]:token:'
        '--name[Custom name for imported playlist]:name:'
        '--help[Show help]'
        '--version[Show version]'
    )

    case $words[2] in
        plugins)
            local -a plugin_cmds
            plugin_cmds=(
                'list:List installed plugins'
                'install:Install a plugin'
                'remove:Remove a plugin'
                'uninstall:Alias for remove'
                'update:Update a plugin'
                'enable:Enable a plugin'
                'disable:Disable a plugin'
            )
            _describe 'plugin commands' plugin_cmds
            return ;;
        import)
            local -a import_sources
            import_sources=('spotify:Import from Spotify' 'youtube:Import from YouTube')
            _describe 'import sources' import_sources
            return ;;
        completions)
            local -a shells
            shells=('bash:Bash completion' 'zsh:Zsh completion' 'powershell:PowerShell completion' 'fish:Fish completion')
            _describe 'shells' shells
            return ;;
    esac

    _arguments -s \\
        $flags \\
        '1:command:->cmd' \\
        '*::args:->args'

    case $state in
        cmd)
            _describe 'commands' commands ;;
        args)
            _message 'arguments' ;;
    esac
}

_ymc
`;
}

function generatePowerShellCompletion(): string {
	const cmds = COMMANDS.map(c => `'${c}'`).join(', ');
	const pluginsSubs = PLUGINS_SUBCOMMANDS.map(c => `'${c}'`).join(', ');
	const importSubs = IMPORT_SUBCOMMANDS.map(c => `'${c}'`).join(', ');
	const completionsSubs = COMPLETIONS_SUBCOMMANDS.map(c => `'${c}'`).join(', ');
	const flags = FLAGS.map(f => `'${f}'`).join(', ');

	return `# youtube-music-cli PowerShell completion
# Add to your PowerShell profile ($PROFILE):
#   ymc completions powershell | Out-File -Append $PROFILE
#   # or:
#   Invoke-Expression (ymc completions powershell | Out-String)

$ymcCompleterBlock = {
    param($wordToComplete, $commandAst, $cursorPosition)

    $commands = @(${cmds})
    $pluginsSubCommands = @(${pluginsSubs})
    $importSubCommands = @(${importSubs})
    $completionsSubCommands = @(${completionsSubs})
    $flags = @(${flags})
    $themes = @('dark', 'light', 'midnight', 'matrix')
    $repeatModes = @('off', 'all', 'one')

    $tokens = $commandAst.CommandElements
    $prevToken = if ($tokens.Count -ge 2) { $tokens[$tokens.Count - 2].ToString() } else { '' }
    $firstArg = if ($tokens.Count -ge 2) { $tokens[1].ToString() } else { '' }

    # Context-aware completions
    switch ($prevToken) {
        'plugins' {
            $pluginsSubCommands | Where-Object { $_ -like "$wordToComplete*" } |
                ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }
            return
        }
        'import' {
            $importSubCommands | Where-Object { $_ -like "$wordToComplete*" } |
                ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }
            return
        }
        'completions' {
            $completionsSubCommands | Where-Object { $_ -like "$wordToComplete*" } |
                ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }
            return
        }
        { $_ -in '--theme', '-t' } {
            $themes | Where-Object { $_ -like "$wordToComplete*" } |
                ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }
            return
        }
        { $_ -in '--repeat', '-r' } {
            $repeatModes | Where-Object { $_ -like "$wordToComplete*" } |
                ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }
            return
        }
    }

    if ($wordToComplete.StartsWith('-')) {
        $flags | Where-Object { $_ -like "$wordToComplete*" } |
            ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }
    } elseif ($firstArg -eq $wordToComplete -or $tokens.Count -le 1) {
        $commands | Where-Object { $_ -like "$wordToComplete*" } |
            ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }
    }
}

Register-ArgumentCompleter -Native -CommandName @('ymc', 'youtube-music-cli') -ScriptBlock $ymcCompleterBlock
`;
}

function generateFishCompletion(): string {
	const commandCompletions = COMMANDS.map(
		cmd =>
			`complete -c ymc -n '__fish_use_subcommand' -f -a '${cmd}' -d '${getFishDescription(cmd)}'`,
	).join('\n');

	const pluginsCompletions = PLUGINS_SUBCOMMANDS.map(
		sub =>
			`complete -c ymc -n '__fish_seen_subcommand_from plugins' -f -a '${sub}'`,
	).join('\n');

	const importCompletions = IMPORT_SUBCOMMANDS.map(
		sub =>
			`complete -c ymc -n '__fish_seen_subcommand_from import' -f -a '${sub}'`,
	).join('\n');

	const completionsCompletions = COMPLETIONS_SUBCOMMANDS.map(
		sub =>
			`complete -c ymc -n '__fish_seen_subcommand_from completions' -f -a '${sub}'`,
	).join('\n');

	return `# youtube-music-cli fish completion
# Save to: ~/.config/fish/completions/ymc.fish
#   ymc completions fish > ~/.config/fish/completions/ymc.fish

# Disable file completions by default
complete -c ymc -f

# Main commands
${commandCompletions}

# Plugins subcommands
${pluginsCompletions}

# Import subcommands
${importCompletions}

# Completions subcommands
${completionsCompletions}

# Flags
complete -c ymc -l theme -s t -d 'Theme to use' -r -a 'dark light midnight matrix'
complete -c ymc -l volume -s v -d 'Initial volume (0-100)' -r
complete -c ymc -l shuffle -s s -d 'Enable shuffle mode'
complete -c ymc -l repeat -s r -d 'Repeat mode' -r -a 'off all one'
complete -c ymc -l headless -d 'Run without TUI'
complete -c ymc -l web -d 'Enable web UI server'
complete -c ymc -l web-host -d 'Web server host' -r
complete -c ymc -l web-port -d 'Web server port' -r
complete -c ymc -l web-only -d 'Run web server without CLI UI'
complete -c ymc -l web-auth -d 'Authentication token for web server' -r
complete -c ymc -l name -d 'Custom name for imported playlist' -r
complete -c ymc -l help -s h -d 'Show help'
complete -c ymc -l version -d 'Show version'

# Also register for youtube-music-cli
complete -c youtube-music-cli -w ymc
`;
}

function getFishDescription(cmd: string): string {
	const descriptions: Record<string, string> = {
		play: 'Play a track by ID or YouTube URL',
		search: 'Search for tracks',
		playlist: 'Play a playlist by ID',
		suggestions: 'Show music suggestions',
		pause: 'Pause playback',
		resume: 'Resume playback',
		skip: 'Skip to next track',
		back: 'Go to previous track',
		plugins: 'Manage plugins',
		import: 'Import playlists from Spotify or YouTube',
		completions: 'Generate shell completion scripts',
	};
	return descriptions[cmd] ?? cmd;
}
