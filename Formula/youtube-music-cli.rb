class YoutubeMusicCli < Formula
  desc "Terminal YouTube Music player"
  homepage "https://github.com/involvex/youtube-music-cli"
  url "https://registry.npmjs.org/@involvex/youtube-music-cli/-/youtube-music-cli-0.0.95.tgz"
  sha256 "c10cb9d10a5b4e85d4a0d87e9da872a84f4b5fe4d7d6ecc1f7ce4c4eece3e246"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
  end

  test do
    assert_match "youtube-music-cli", shell_output("#{bin}/youtube-music-cli --help")
  end
end
