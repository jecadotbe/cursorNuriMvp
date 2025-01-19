{/* Side actions */}
            <div className="absolute right-4 bottom-20 flex flex-col gap-6">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white"
                onClick={() => setIsLiked(!isLiked)}
              >
                <Heart className={`h-6 w-6 ${isLiked ? 'fill-white' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" className="text-white">
                <Share2 className="h-6 w-6" />
              </Button>
            </div>