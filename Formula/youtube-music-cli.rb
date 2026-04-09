class YoutubeMusicCli < Formula
  desc "Terminal YouTube Music player"
  homepage "https://github.com/involvex/youtube-music-cli"
  url "https://registry.npmjs.org/@involvex/youtube-music-cli/-/youtube-music-cli-0.0.64.tgz"
  sha256 "ff61e129bfe2b6d3643462488657643ed7a8ef45a40526e22c53c0ce272d423e"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec/"bin/youtube-music-cli"
    bin.install_symlink libexec/"bin/ymc"
  end

  test do
    assert_match "youtube-music-cli", shell_output("#{bin}/youtube-music-cli --help")
  end
end
