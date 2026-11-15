class YoutubeMusicCli < Formula
  desc "Terminal YouTube Music player"
  homepage "https://github.com/involvex/youtube-music-cli"
  url "https://registry.npmjs.org/@involvex/youtube-music-cli/-/youtube-music-cli-0.3.8.tgz"
  sha256 "1c1c8465c2ce8020b790a5ef1b94957eb87e6e78b96f097d24713e0fb55ee280"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir[libexec/"bin/*"]
  end

  test do
    assert_match "youtube-music-cli", shell_output("#{bin}/youtube-music-cli --help")
  end
end
