export type PackageType = 'appImage' | 'tarGz' | 'tarXz' | 'tarBz2' | 'tar' | 'unknown';

export interface DiscoveredBinary {
  path: string;
  relativePath: string;
  name: string;
  isElf: boolean;
  isScript: boolean;
  isPrimaryCandidate: boolean;
}

export interface InspectResult {
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  sha256Checksum: string;
  packageType: PackageType;
  suggestedName: string;
  suggestedVersion: string;
  suggestedAlias: string;
  description: string;
  categories: string[];
  iconBase64?: string;
  iconMime?: string;
  discoveredBinaries: DiscoveredBinary[];
  embeddedDesktopName?: string;
  stagingDir?: string;
}

export interface InstallRequest {
  filePath: string;
  packageType: PackageType;
  name: string;
  version: string;
  selectedBinaryRelative: string;
  cliAlias: string;
  categories: string[];
  description: string;
  createDesktopShortcut: boolean;
  createTerminalSymlink: boolean;
  iconBase64?: string;
  stagingDir?: string;
}

export interface InstalledPackage {
  id: string;
  name: string;
  version: string;
  packageType: PackageType;
  installedAt: string;
  sourceFile: string;
  sourceSha256: string;
  installDir: string;
  primaryBinary: string;
  cliAlias: string;
  symlinks: string[];
  desktopFiles: string[];
  iconFiles: string[];
  installedFiles: string[];
  totalSizeBytes: number;
  totalSizeFormatted: string;
  categories: string[];
  description: string;
  iconBase64?: string;
  changeAuditLog: string[];
  isHealthy: boolean;
}

export interface AppConfig {
  installBaseDir: string;
  binDir: string;
  applicationsDir: string;
  iconsDir: string;
  cacheDir: string;
  activeTheme: string;
  colorMode: 'dark' | 'light';
  animationLevel: 'smooth' | 'subtle' | 'reduced';
  checkPathOnStartup: boolean;
  autoRefreshDesktopDatabase: boolean;
  defaultCreateDesktop: boolean;
  defaultCreateSymlink: boolean;
  defaultCategories: string[];
  preferredShell: string;
  allowPrivilegedSystemPaths: boolean;
}

export type ColorMode = 'dark' | 'light';

export interface PathPreset {
  id: string;
  label: string;
  path: string;
  isPrivileged: boolean;
  description: string;
}

export interface DirectoryPresets {
  binDirs: PathPreset[];
  installDirs: PathPreset[];
  applicationDirs: PathPreset[];
  iconDirs: PathPreset[];
}

export interface UninstallRequest {
  packageId: string;
  purgeUserConfigs: boolean;
}

export interface CacheStatusReport {
  cacheDir: string;
  sizeBytes: number;
  sizeFormatted: string;
  itemCount: number;
}

export interface ShellConfigInfo {
  shellName: string;
  configPath: string;
  fileExists: boolean;
  hasPathEntry: boolean;
}

export interface PathStatusReport {
  isInCurrentPath: boolean;
  targetBinDir: string;
  currentPathEnv: string;
  shellConfigs: ShellConfigInfo[];
}

export type ThemeKey = 'gtk' | 'kde' | 'macos' | 'cosmic' | 'nord';

export interface ThemeDefinition {
  key: ThemeKey;
  name: string;
  philosophy: string;
  accent: string;
  icon: string;
}

export type ActiveView = 'packages' | 'settings' | 'legal' | 'help';
